'use client';

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/router";
import Image from "next/image";

const SidebarComponent = ({ 
  vehicles = [], 
  onSelectVehicle, 
  onTambahKendaraan, 
  onDeleteVehicle,
  onSetGeofence, // TAMBAHAN: Props untuk handle geofence
  onHistoryClick // TAMBAHAN: Props untuk handle history dari dashboard
}) => {
  const router = useRouter();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // State untuk modal notifikasi "tidak ada history"
  const [showNoHistoryAlert, setShowNoHistoryAlert] = useState(false);

  // Fungsi untuk logout dari aplikasi
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        localStorage.removeItem("token");
        router.push("/auth/login");
      })
      .catch((error) => {
        console.error("Logout Error:", error);
      });
  };

  // Fungsi untuk memilih kendaraan dan reset riwayat
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setShowHistory(false);
    onSelectVehicle(vehicle);
  };

  // UPDATED: Fungsi untuk menampilkan atau menyembunyikan riwayat kendaraan
  const handleHistoryClick = () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");
      return;
    }

    // Cek apakah kendaraan memiliki lokasi/position
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle || !selectedVehicle.position) {
      setShowNoHistoryAlert(true);
      return;
    }

    if (showHistory) {
      const selected = vehicles.find((v) => v.id === selectedVehicleId);
      if (selected) {
        onSelectVehicle({ ...selected, path: [] });
      }
      setShowHistory(false);
    } else {
      // UPDATED: Gunakan onHistoryClick dari props untuk kependensi dengan dashboard
      if (onHistoryClick) {
        onHistoryClick(selectedVehicleId);
        setShowHistory(true);
      } else {
        // Fallback ke cara lama jika props tidak ada
        fetch("/api/history")
          .then((res) => res.json())
          .then((data) => {
            const riwayat = data.data
              .filter((item) => item.id === selectedVehicleId)
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
              .map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)]);

            const selected = vehicles.find((v) => v.id === selectedVehicleId);
            if (selected) {
              onSelectVehicle({ ...selected, path: riwayat });
            }
            setShowHistory(true);
          })
          .catch((err) => {
            console.error("Gagal ambil riwayat koordinat:", err);
          });
      }
    }
  };

  // TAMBAHAN: Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    if (onSetGeofence) {
      onSetGeofence();
    }
  };

  // Fungsi untuk menampilkan konfirmasi hapus kendaraan
  const handleShowDeleteConfirm = (vehicle, e) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setShowDeleteConfirm(true);
  };

  // Fungsi untuk membatalkan penghapusan
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVehicleToDelete(null);
  };

  // Fungsi untuk menampilkan notifikasi sukses
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
    
    // Auto hide notification after 3 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
      setSuccessMessage('');
    }, 3000);
  };

  // Fungsi untuk menutup notifikasi sukses
  const handleCloseSuccessNotification = () => {
    setShowSuccessNotification(false);
    setSuccessMessage('');
  };

  // Fungsi untuk menghapus kendaraan
  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      console.log('Deleting vehicle:', vehicleToDelete);
      
      if (selectedVehicleId === vehicleToDelete.id) {
        setSelectedVehicleId(null);
        setShowHistory(false);
      }
      
      const deletedVehicle = vehicleToDelete;
      onDeleteVehicle(vehicleToDelete.id);
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
      
      showSuccessMessage(`Kendaraan ${deletedVehicle.model} (${deletedVehicle.nomor_kendaraan}) berhasil dihapus!`);
    }
  };

  // Fungsi untuk menyalakan mesin (ENGINE ON)
  const handleEngineOn = async () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) {
      alert("Kendaraan tidak ditemukan.");
      return;
    }

    // Validasi: Cek apakah mesin sudah nyala
    if (selectedVehicle.relay_status === 'ON') {
      alert(`Mesin kendaraan ${selectedVehicle.model} sudah dalam keadaan menyala.`);
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id || selectedVehicle.id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'ON'
        }),
      });
      
      if (response.ok) {
        alert(`Mesin kendaraan ${selectedVehicle.model} berhasil dinyalakan`);
        
        // Update data kendaraan di state lokal tanpa refresh
        if (onSelectVehicle && selectedVehicle) {
          const updatedVehicle = { ...selectedVehicle, relay_status: 'ON' };
          onSelectVehicle(updatedVehicle);
        }
      } else {
        const errorData = await response.json();
        alert(`Gagal menyalakan mesin: ${errorData.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      alert(`Koneksi terputus. Silakan coba lagi`);
    }
  };

  // Fungsi untuk mematikan mesin (ENGINE OFF)
  const handleEngineOff = async () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) {
      alert("Kendaraan tidak ditemukan.");
      return;
    }

    // Validasi: Cek apakah mesin sudah mati
    if (selectedVehicle.relay_status === 'OFF') {
      alert(`Mesin kendaraan ${selectedVehicle.model} sudah dalam keadaan mati`);
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id || selectedVehicle.id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'OFF'
        }),
      });
      
      if (response.ok) {
        alert(`Mesin kendaraan ${selectedVehicle.model} berhasil dimatikan`);
        
        // Update data kendaraan di state lokal tanpa refresh
        if (onSelectVehicle && selectedVehicle) {
          const updatedVehicle = { ...selectedVehicle, relay_status: 'OFF' };
          onSelectVehicle(updatedVehicle);
        }
      } else {
        const errorData = await response.json();
        alert(`Gagal mematikan mesin: ${errorData.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      alert(`Koneksi terputus. Silakan coba lagi`);
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
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => {
            // Debug logging untuk melihat struktur data setiap kendaraan
            console.log("Vehicle data structure:", vehicle);
            
            return (
              <div
                key={vehicle.id}
                className={`p-3 mb-2 rounded-md cursor-pointer relative ${
                  selectedVehicleId === vehicle.id ? "bg-blue-200" : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleSelectVehicle(vehicle)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{vehicle.model} ({vehicle.nomor_kendaraan})</p>
                    {/* Handle kedua kemungkinan field name untuk jenis kendaraan */}
                    <p className="text-sm text-black">
                      Jenis: {vehicle.jenis_kendaraan || vehicle.Jenis_Kendaraan || vehicle.jenis || "Tidak tersedia"}
                    </p>
                    <p className="text-sm text-black">Merek: {vehicle.merek || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Warna: {vehicle.warna || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Pemilik: {vehicle.pemilik || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Tahun: {vehicle.tahun_pembuatan || "Tidak tersedia"}</p>
                    {/* Menampilkan status relay/mesin */}
                    {vehicle.relay_status && (
                      <p className="text-sm text-black">
                        Status Mesin: {
                          vehicle.relay_status === 'ON'
                            ? <span className="text-green-600 font-semibold">ON</span>
                            : <span className="text-red-600 font-semibold">OFF</span>
                        }
                      </p>
                    )}
                    <p className="text-sm text-black">
                      Lokasi: {vehicle.position 
                        ? `${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}` 
                        : "Tidak tersedia"}
                    </p>
                  </div>
                  {/* Tombol hapus untuk setiap kendaraan */}
                  <button 
                    onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200"
                    title={`Hapus kendaraan ${vehicle.model}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500">Tidak ada kendaraan</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button 
          onClick={handleEngineOn}
          className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
        >
          ENGINE ON
        </button>
        <button 
          onClick={handleEngineOff}
          className="w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
        >
          ENGINE OFF
        </button>
        <button 
          onClick={onTambahKendaraan} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          TAMBAH KENDARAAN
        </button>
        <button 
          onClick={handleSetGeofence}
          className="w-full py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors duration-200"
        >
          SET GEOFENCE
        </button>
        <button 
          onClick={handleHistoryClick} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
        </button>
      </div>

      {/* Tombol logout */}
      <button 
        onClick={handleLogout} 
        className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 text-lg rounded-md w-full transition-colors duration-200"
      >
        Logout
      </button>

      {/* Modal notifikasi tidak ada history */}
      {showNoHistoryAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-500">⚠️ Tidak Ada History</h3>
            <p className="mb-4">
              Kendaraan <strong>
                {vehicles.find(v => v.id === selectedVehicleId)?.model} (
                {vehicles.find(v => v.id === selectedVehicleId)?.nomor_kendaraan})
              </strong> tidak memiliki data lokasi. History perjalanan tidak tersedia.
            </p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowNoHistoryAlert(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {showDeleteConfirm && vehicleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="mb-4">
              Apakah Anda yakin ingin menghapus kendaraan <strong>{vehicleToDelete.model}</strong> dengan nomor <strong>{vehicleToDelete.nomor_kendaraan}</strong>?
            </p>
            <div className="flex justify-end mt-6 space-x-2">
              <button 
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal notifikasi sukses */}
      {showSuccessNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-green-600">Berhasil Menghapus Kendaraan!</h3>
            <p className="mb-4">{successMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleCloseSuccessNotification}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarComponent;