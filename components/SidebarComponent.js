'use client';

import { useState, useEffect } from "react";
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
  
  // TAMBAHAN dari code 2: State untuk relay
  const [relays, setRelays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk modal notifikasi "tidak ada history"
  const [showNoHistoryAlert, setShowNoHistoryAlert] = useState(false);
  
  // TAMBAHAN dari code 2: State untuk notifikasi relay
  const [showRelayNotification, setShowRelayNotification] = useState(false);
  const [relayMessage, setRelayMessage] = useState('');
  const [relayNotifStatus, setRelayNotifStatus] = useState('success');

  // TAMBAHAN dari code 2: Fungsi untuk mengambil data relay melalui proxy API
  useEffect(() => {
    fetchRelays();
  }, []);

  const fetchRelays = async () => {
    try {
      // Use local Next.js API route instead of direct EC2 endpoint
      const response = await fetch("/api/relays");
      if (!response.ok) {
        throw new Error(`Failed to fetch relays: ${response.status}`);
      }
      const data = await response.json();
      setRelays(data.data || []);
    } catch (error) {
      console.error("Error fetching relays:", error);
      // Silently fail but log the error - prevent component from crashing
      setRelays([]);
    }
  };

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

  // TAMBAHAN dari code 2: Fungsi untuk mengontrol relay (ENGINE ON)
  const handleEngineOn = async () => {
    if (!selectedVehicleId) {
      showRelayNotif("Pilih kendaraan terlebih dahulu.", "error");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle.relay_id) {
      showRelayNotif(`Kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) tidak memiliki relay terpasang.`, "error");
      return;
    }

    setIsLoading(true);
    try {
      const relayId = selectedVehicle.relay_id;
      const relay = relays.find(r => r.id === relayId);
      
      if (!relay) {
        showRelayNotif(`Relay dengan ID ${relayId} tidak ditemukan.`, "error");
        setIsLoading(false);
        return;
      }
      
      // Use local Next.js API route instead of direct EC2 endpoint
      const response = await fetch(`/api/relays/${relayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: 1,
          last_updated: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        await fetchRelays();
        showRelayNotif(`Mesin kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) berhasil dinyalakan!`, "success");
      } else {
        const errorData = await response.json();
        showRelayNotif(`Gagal menyalakan mesin: ${errorData.errors?.[0]?.message || 'Unknown error'}`, "error");
      }
    } catch (error) {
      console.error("Error turning on engine:", error);
      showRelayNotif(`Terjadi kesalahan: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // TAMBAHAN dari code 2: Fungsi untuk mengontrol relay (ENGINE OFF)
  const handleEngineOff = async () => {
    if (!selectedVehicleId) {
      showRelayNotif("Pilih kendaraan terlebih dahulu.", "error");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle.relay_id) {
      showRelayNotif(`Kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) tidak memiliki relay terpasang.`, "error");
      return;
    }

    setIsLoading(true);
    try {
      const relayId = selectedVehicle.relay_id;
      const relay = relays.find(r => r.id === relayId);
      
      if (!relay) {
        showRelayNotif(`Relay dengan ID ${relayId} tidak ditemukan.`, "error");
        setIsLoading(false);
        return;
      }
      
      // Use local Next.js API route
      const response = await fetch(`/api/relays/${relayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: 0,
          last_updated: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        await fetchRelays();
        showRelayNotif(`Mesin kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) berhasil dimatikan!`, "success");
      } else {
        const errorData = await response.json();
        showRelayNotif(`Gagal mematikan mesin: ${errorData.errors?.[0]?.message || 'Unknown error'}`, "error");
      }
    } catch (error) {
      console.error("Error turning off engine:", error);
      showRelayNotif(`Terjadi kesalahan: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // TAMBAHAN dari code 2: Fungsi untuk menampilkan notifikasi relay
  const showRelayNotif = (message, status) => {
    setRelayMessage(message);
    setRelayNotifStatus(status);
    setShowRelayNotification(true);

    setTimeout(() => {
      setShowRelayNotification(false);
      setRelayMessage('');
    }, 3000);
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

  // TAMBAHAN dari code 2: Fungsi untuk menutup notifikasi relay
  const handleCloseRelayNotification = () => {
    setShowRelayNotification(false);
    setRelayMessage('');
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

  // TAMBAHAN dari code 2: Mendapatkan status relay untuk kendaraan yang dipilih
  const getSelectedVehicleRelayStatus = () => {
    if (!selectedVehicleId) return null;

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle || !selectedVehicle.relay_id) return null;

    const relay = relays.find(r => r.id === selectedVehicle.relay_id);
    return relay ? relay.is_active : null;
  };

  const selectedRelayStatus = getSelectedVehicleRelayStatus();

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
                    <p className="text-sm text-black">
                      Lokasi: {vehicle.position 
                        ? `${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}` 
                        : "Tidak tersedia"}
                    </p>
                    {/* TAMBAHAN dari code 2: Tampilkan status mesin */}
                    {vehicle.relay_id && (
                      <p className="text-sm text-black">
                        Status Mesin: {
                          relays.find(r => r.id === vehicle.relay_id)?.is_active === 1
                             ? <span className="text-green-600 font-semibold">ON</span>
                             : <span className="text-red-600 font-semibold">OFF</span>
                        }
                      </p>
                    )}
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
        {/* TAMBAHAN dari code 2: Button ENGINE ON dengan loading state */}
        <button 
          onClick={handleEngineOn}
          disabled={isLoading || !selectedVehicleId}
          className={`w-full py-2 ${
            isLoading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
          } text-white rounded-md transition-colors duration-200 flex justify-center items-center`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              LOADING...
            </>
          ) : (
            'ENGINE ON'
          )}
        </button>
        
        {/* TAMBAHAN dari code 2: Button ENGINE OFF dengan loading state */}
        <button 
          onClick={handleEngineOff}
          disabled={isLoading || !selectedVehicleId}
          className={`w-full py-2 ${
            isLoading ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
          } text-white rounded-md transition-colors duration-200 flex justify-center items-center`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              LOADING...
            </>
          ) : (
            'ENGINE OFF'
          )}
        </button>
        
        <button 
          onClick={onTambahKendaraan} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          TAMBAH KENDARAAN
        </button>
        {/* UPDATED: Button SET GEOFENCE dengan handler */}
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

      {/* TAMBAHAN dari code 2: Modal notifikasi relay */}
      {showRelayNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className={`text-lg font-bold mb-4 ${relayNotifStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {relayNotifStatus === 'success' ? '✅ Berhasil' : '⚠️ Gagal'}
            </h3>
            <p className="mb-4">{relayMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleCloseRelayNotification}
                className={`px-4 py-2 ${
                  relayNotifStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                } text-white rounded-md transition-colors duration-200`}
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