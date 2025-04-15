// pages/dashboard.js

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";

const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard({ vehicles }) {
  const router = useRouter();
  const mapRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0] || null);
  const [vehicleHistories, setVehicleHistories] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Fungsi untuk handle klik kendaraan dari sidebar
  const handleHistoryClick = async (vehicleId) => {
    if (!vehicleId) return;
  
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
  
      const filteredCoords = data.data
        .filter(coord => coord.id === vehicleId)
        .map(coord => ({
          lat: parseFloat(coord.latitude),
          lng: parseFloat(coord.longitude),
        }));
  
      if (mapRef.current) {
        mapRef.current.drawHistoryPolyline(filteredCoords); // ⬅️ pastikan fungsi ini ada di MapComponent
      }
  
    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
    }
  };
  

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="h-screen bg-gray-100 flex">
      <SidebarComponent 
        vehicles={vehicles}
        onSelectVehicle={vehicle => setSelectedVehicle(vehicle)}
        onHistoryClick={handleHistoryClick}
        />

      <div className="flex-grow">
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
        />
      </div>
    </div>
  );
}

// Ambil data kendaraan + posisi terakhir
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

    const combined = kendaraan.data.map((vehicle) => {
      const vehicleCoords = koordinat.data
        .filter((coord) => coord.id === vehicle.id)
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
