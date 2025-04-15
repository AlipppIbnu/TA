// components/SidebarComponent.js

import { useState } from "react";
import { signOut } from "firebase/auth"; 
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/router"; 
import Image from "next/image"; 

const SidebarComponent = ({ vehicles = [], onSelectVehicle }) => {
  const router = useRouter();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showHistory, setShowHistory] = useState(false); // State untuk toggle riwayat

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setShowHistory(false); // Reset riwayat saat kendaraan baru dipilih
    onSelectVehicle(vehicle);
  };

  const handleHistoryClick = async () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");
      return;
    }

    if (showHistory) {
      // Sembunyikan riwayat
      const selected = vehicles.find((v) => v.id === selectedVehicleId);
      if (selected) {
        onSelectVehicle({ ...selected, path: [] }); // Kosongkan path
      }
      setShowHistory(false);
    } else {
      // Tampilkan riwayat
      try {
        const res = await fetch("/api/history");
        const data = await res.json();

        const riwayat = data.data
          .filter((item) => item.id === selectedVehicleId)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)]);

        const selected = vehicles.find((v) => v.id === selectedVehicleId);
        if (selected) {
          onSelectVehicle({ ...selected, path: riwayat }); // Kirim path ke parent
        }
        setShowHistory(true);
      } catch (err) {
        console.error("Gagal ambil riwayat koordinat:", err);
      }
    }
  };

  return (
    <div className="w-80 bg-white shadow-md h-screen flex flex-col p-4">
      <div className="flex justify-center mb-6 mt-4">
        <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={150} height={50} />
      </div>

      <h2 className="text-center font-bold text-lg mb-3">Daftar Kendaraan</h2>

      <div className="flex-grow overflow-y-auto">
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`p-3 mb-2 rounded-md cursor-pointer ${
                selectedVehicleId === vehicle.id
                  ? "bg-blue-200"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <p className="font-bold">
                {vehicle.merek} {vehicle.model} ({vehicle.nomor_kendaraan})
              </p>
              <p className="text-sm text-black">Jenis: {vehicle.jenis_kendaraan}</p>
              <p className="text-sm text-black">Warna: {vehicle.warna}</p>
              <p className="text-sm text-black">Pemilik: {vehicle.pemilik}</p>
              <p className="text-sm text-black">Tahun: {vehicle.tahun_pembuatan}</p>
              <p className="text-sm text-black">
                Lokasi:{" "}
                {vehicle.position
                  ? `${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}`
                  : "Tidak tersedia"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Tidak ada kendaraan</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button className="w-full py-2 bg-green-500 text-white rounded-md">ENGINE ON</button>
        <button className="w-full py-2 bg-red-500 text-white rounded-md">ENGINE OFF</button>
        <button className="w-full py-2 bg-green-500 text-white rounded-md">SET GEOFENCE</button>
        <button
          onClick={handleHistoryClick}
          className="w-full py-2 bg-blue-500 text-white rounded-md"
        >
          {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 text-lg rounded-md w-full"
      >
        Logout
      </button>
    </div>
  );
};

export default SidebarComponent;
