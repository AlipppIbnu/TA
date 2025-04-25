// pages/dashboard.js

import dynamic from "next/dynamic"; // Memuat MapComponent secara dinamis agar tidak SSR
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; // Modal untuk tambah kendaraan

// Memuat MapComponent dinamis (peta menggunakan Leaflet)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard({ vehicles }) {
  const router = useRouter();
  const mapRef = useRef(null);

  // State untuk menyimpan data user, kendaraan yang dipilih, dan lainnya
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0] || null); // Kendaraan yang dipilih pertama kali
  const [showTambahModal, setShowTambahModal] = useState(false); // Modal untuk tambah kendaraan

  // Mengatur otentikasi pengguna dengan Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Menyimpan user yang terautentikasi
      } else {
        router.replace("/auth/login"); // Redirect ke halaman login jika tidak ada user
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener ketika komponen di-unmount
  }, [router]);

  // Menangani klik pada histori kendaraan
  const handleHistoryClick = async (vehicleId) => {
    if (!vehicleId) return;

    try {
      const res = await fetch("/api/history");
      const data = await res.json();

      const filteredCoords = (data?.data || [])
        .filter(coord => coord.kendaraan_id === vehicleId)
        .map(coord => ({
          lat: parseFloat(coord.latitude),
          lng: parseFloat(coord.longitude),
        }));

      if (mapRef.current && filteredCoords.length) {
        mapRef.current.drawHistoryPolyline(filteredCoords); // Menggambar polyline di peta
      }
    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
    }
  };

  // Menangani aksi menambah kendaraan
  const handleTambahKendaraan = () => {
    setShowTambahModal(true); // Menampilkan modal tambah kendaraan
  };

  // Menangani aksi setelah kendaraan berhasil ditambah
  const handleTambahSukses = () => {
    setShowTambahModal(false); // Menutup modal
    router.reload(); // Reload halaman untuk menampilkan kendaraan baru
  };

  // Jika loading, tampilkan pesan loading
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="h-screen bg-gray-100 flex">
      <SidebarComponent 
        vehicles={vehicles}
        onSelectVehicle={vehicle => setSelectedVehicle(vehicle)} // Mengubah kendaraan yang dipilih
        onHistoryClick={handleHistoryClick} // Menangani klik histori kendaraan
        onTambahKendaraan={handleTambahKendaraan} // Menangani klik tombol tambah kendaraan
      />

      <div className="flex-grow">
        <MapComponent
          ref={mapRef} // Mengirimkan ref ke MapComponent untuk menggambar di peta
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
        />
      </div>

      {showTambahModal && (
        <ModalTambahKendaraan
          onClose={() => setShowTambahModal(false)} // Menutup modal
          onSucceed={handleTambahSukses} // Menangani setelah kendaraan ditambah
        />
      )}
    </div>
  );
}

// Fetch data kendaraan dan posisi terakhir
export async function getServerSideProps() {
  try {
    const [resKendaraan, resKoordinat] = await Promise.all([
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan"),
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1"),
    ]);

    if (!resKendaraan.ok || !resKoordinat.ok) {
      throw new Error("Gagal fetch dari API eksternal.");
    }

    const kendaraan = await resKendaraan.json();
    const koordinat = await resKoordinat.json();

    // Menggabungkan data kendaraan dengan posisi terakhir dari koordinat
    const combined = kendaraan.data.map((vehicle) => {
      const vehicleCoords = koordinat.data
        .filter((coord) => coord.kendaraan_id === vehicle.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const latest = vehicleCoords[0];

      return {
        ...vehicle,
        position: latest
          ? {
              lat: parseFloat(latest.latitude),
              lng: parseFloat(latest.longitude),
              timestamp: latest.timestamp,
            }
          : null,
      };
    });

    return { props: { vehicles: combined } };
  } catch (err) {
    console.error("❌ Gagal fetch data server:", err);
    return { props: { vehicles: [] } };
  }
}
