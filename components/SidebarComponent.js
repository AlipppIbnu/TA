import { useState } from "react";
import { signOut } from "firebase/auth";  // Mengimpor fungsi signOut dari Firebase Authentication
import { auth } from "@/lib/firebaseConfig";  // Mengimpor konfigurasi Firebase dari file khusus
import { useRouter } from "next/router";  // Mengimpor useRouter dari Next.js untuk navigasi halaman
import Image from "next/image";  // Mengimpor komponen Image dari Next.js untuk menampilkan gambar

// Komponen Sidebar, menerima props untuk daftar kendaraan, event handler untuk memilih kendaraan dan menambah kendaraan
const SidebarComponent = ({ vehicles = [], onSelectVehicle, onTambahKendaraan }) => {
  const router = useRouter();  // Hook untuk navigasi halaman
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);  // State untuk menyimpan id kendaraan yang dipilih
  const [showHistory, setShowHistory] = useState(false);  // State untuk toggle tampilan riwayat kendaraan

  // Fungsi untuk logout dari aplikasi
  const handleLogout = async () => {
    try {
      await signOut(auth);  // Logout dari Firebase
      localStorage.removeItem("token");  // Menghapus token login dari localStorage
      router.push("/auth/login");  // Mengarahkan pengguna ke halaman login setelah logout
    } catch (error) {
      console.error("Logout Error:", error);  // Menangani jika terjadi error saat logout
    }
  };

  // Fungsi untuk memilih kendaraan dan reset riwayat
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);  // Set kendaraan yang dipilih
    setShowHistory(false);  // Reset tampilan riwayat saat kendaraan baru dipilih
    onSelectVehicle(vehicle);  // Memanggil fungsi onSelectVehicle dari parent
  };

  // Fungsi untuk menampilkan atau menyembunyikan riwayat kendaraan
  const handleHistoryClick = async () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");  // Menampilkan peringatan jika kendaraan belum dipilih
      return;
    }

    if (showHistory) {
      // Menyembunyikan riwayat
      const selected = vehicles.find((v) => v.id === selectedVehicleId);  // Mencari kendaraan yang dipilih
      if (selected) {
        onSelectVehicle({ ...selected, path: [] });  // Mengirimkan kendaraan tanpa path ke parent
      }
      setShowHistory(false);  // Menyembunyikan riwayat
    } else {
      // Menampilkan riwayat
      try {
        const res = await fetch("/api/history");  // Mengambil data riwayat kendaraan dari API
        const data = await res.json();  // Mengubah data menjadi format JSON

        const riwayat = data.data
          .filter((item) => item.id === selectedVehicleId)  // Menyaring data riwayat berdasarkan id kendaraan
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))  // Mengurutkan berdasarkan waktu
          .map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)]);  // Membuat array koordinat

        const selected = vehicles.find((v) => v.id === selectedVehicleId);  // Mencari kendaraan yang dipilih
        if (selected) {
          onSelectVehicle({ ...selected, path: riwayat });  // Mengirimkan kendaraan dengan riwayat perjalanan ke parent
        }
        setShowHistory(true);  // Menampilkan riwayat
      } catch (err) {
        console.error("Gagal ambil riwayat koordinat:", err);  // Menangani error jika gagal mengambil riwayat
      }
    }
  };

  return (
    <div className="w-80 bg-white shadow-md h-screen flex flex-col p-4">
      {/* Logo aplikasi */}
      <div className="flex justify-center mb-6 mt-4">
        <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={150} height={50} />
      </div>

      <h2 className="text-center font-bold text-lg mb-3">Daftar Kendaraan</h2>

      <div className="flex-grow overflow-y-auto">
        {/* Menampilkan daftar kendaraan */}
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`p-3 mb-2 rounded-md cursor-pointer ${selectedVehicleId === vehicle.id ? "bg-blue-200" : "bg-gray-200 hover:bg-gray-200"}`}
              onClick={() => handleSelectVehicle(vehicle)}  // Fungsi untuk memilih kendaraan
            >
              <p className="font-bold">{vehicle.merek} {vehicle.model} ({vehicle.nomor_kendaraan})</p>
              <p className="text-sm text-black">Jenis: {vehicle.jenis_kendaraan}</p>
              <p className="text-sm text-black">Warna: {vehicle.warna}</p>
              <p className="text-sm text-black">Pemilik: {vehicle.pemilik}</p>
              <p className="text-sm text-black">Tahun: {vehicle.tahun_pembuatan}</p>
              <p className="text-sm text-black">
                Lokasi: {vehicle.position ? `${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}` : "Tidak tersedia"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Tidak ada kendaraan</p>  // Jika tidak ada kendaraan, tampilkan pesan ini
        )}
      </div>

      <div className="mt-4 space-y-2">
        {/* Tombol-tombol untuk mengatur kendaraan */}
        <button className="w-full py-2 bg-green-500 text-white rounded-md">ENGINE ON</button>
        <button className="w-full py-2 bg-red-500 text-white rounded-md">ENGINE OFF</button>
        <button onClick={onTambahKendaraan} className="w-full py-2 bg-blue-500 text-white rounded-md">
          TAMBAH KENDARAAN
        </button>
        <button className="w-full py-2 bg-green-500 text-white rounded-md">SET GEOFENCE</button>
        <button onClick={handleHistoryClick} className="w-full py-2 bg-blue-500 text-white rounded-md">
          {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}  {/* Menampilkan atau menyembunyikan riwayat kendaraan */}
        </button>
      </div>

      {/* Tombol logout */}
      <button onClick={handleLogout} className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 text-lg rounded-md w-full">
        Logout
      </button>
    </div>
  );
};

export default SidebarComponent;
