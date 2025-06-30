//SidebarComponent

'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { getCurrentUser } from "@/lib/authService";
import { useWebSocket } from '@/lib/hooks/useWebSocket';
// Modal History Date Range - dipindahkan ke dalam komponen ini
function ModalHistoryDateRange({ onClose, onSelectDateRange }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError('Silakan pilih tanggal mulai dan tanggal akhir');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end date to end of day

    if (end < start) {
      setError('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    // Set start date to start of day
    start.setHours(0, 0, 0, 0);

    onSelectDateRange(start.toISOString(), end.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white p-4 rounded shadow-lg max-w-[300px] w-full mx-2">
        <h3 className="text-sm font-bold mb-3 text-center">Pilih Rentang Waktu History</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button 
            onClick={onClose}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors duration-200"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors duration-200"
          >
            Lihat History
          </button>
        </div>
      </div>
    </div>
  );
}

const SidebarComponent = ({ 
  vehicles = [], 
  onSelectVehicle, 
  onTambahKendaraan, 
  onDeleteVehicle,
  onSetGeofence,
  onHistoryClick,
  onHideHistory,
  selectedVehicle,
  onToggleGeofence,
  onUpdateVehicle
}) => {
  
  // State untuk kendaraan
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHistoryDateRangeModal, setShowHistoryDateRangeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [vehicleGeofenceVisibility, setVehicleGeofenceVisibility] = useState({});
  
  // State untuk notifikasi
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSelectVehicleAlert, setShowSelectVehicleAlert] = useState(false);
  const [showNoHistoryAlert, setShowNoHistoryAlert] = useState(false);
  const [showRelayNotification, setShowRelayNotification] = useState(false);
  const [relayMessage, setRelayMessage] = useState('');
  const [relayNotifStatus, setRelayNotifStatus] = useState('success');
  const [error, setError] = useState('');
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  
  // State untuk relay
  const [loadingVehicles, setLoadingVehicles] = useState({});
  
  // State baru untuk loading modal relay
  const [showRelayLoadingModal, setShowRelayLoadingModal] = useState(false);
  const [relayLoadingVehicleId, setRelayLoadingVehicleId] = useState(null);
  const [relayLoadingAction, setRelayLoadingAction] = useState(''); // 'ON' atau 'OFF'
  const [relayLoadingVehicleName, setRelayLoadingVehicleName] = useState('');
  const [relayLoadingVehiclePlate, setRelayLoadingVehiclePlate] = useState('');
  const [relayStatusChanged, setRelayStatusChanged] = useState(false);
  const [initialRelayStatus, setInitialRelayStatus] = useState('');

  // State untuk vehicle data dari WebSocket
  const [vehicleData, setVehicleData] = useState([]);

  // Gunakan WebSocket untuk real-time data
  const { data: wsData, isConnected } = useWebSocket();

  // Update vehicle data ketika WebSocket mengirim data baru
  useEffect(() => {
    if (wsData && wsData.data && Array.isArray(wsData.data)) {
      // Transform data menjadi array dengan format yang sesuai
      const newVehicleData = wsData.data.map(data => ({
        gps_id: data.gps_id,
        speed: data.speed,
        rpm: data.rpm,
        fuel_level: data.fuel_level,
        ignition_status: data.ignition_status,
        battery_level: data.battery_level,
        satellites_used: data.satellites_used,
        timestamp: data.timestamp
      }));
      setVehicleData(newVehicleData);
    }
  }, [wsData]);

  // Monitor WebSocket connection status
  useEffect(() => {
    if (!isConnected) {
      console.warn("⚠️ WebSocket disconnected - vehicle data may be stale");
    }
  }, [isConnected]);

  // Monitor perubahan status relay
  useEffect(() => {
    if (showRelayLoadingModal && relayLoadingVehicleId) {
      const currentVehicle = vehicles.find(v => v.vehicle_id === relayLoadingVehicleId);
      if (currentVehicle && currentVehicle.relay_status !== initialRelayStatus) {
        // Status sudah berubah
        setRelayStatusChanged(true);
      }
    }
  }, [vehicles, relayLoadingVehicleId, initialRelayStatus, showRelayLoadingModal]);

  // Helper function untuk mendapatkan data kendaraan berdasarkan gps_id
  const getVehicleDataByGpsId = (gpsId) => {
    return vehicleData.find(data => data.gps_id === gpsId) || null;
  };

  // Fungsi untuk memilih kendaraan
  const handleSelectVehicle = (vehicle) => {
    // Verifikasi kendaraan masih ada dalam daftar
    const existingVehicle = vehicles.find((v) => v.vehicle_id === vehicle.vehicle_id);
    if (!existingVehicle) {
      showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
      return;
    }

    setSelectedVehicleId(vehicle.vehicle_id);
    setShowHistory(false);
    onSelectVehicle(existingVehicle);
  };

  // Fungsi untuk menampilkan riwayat kendaraan
  const handleHistoryClick = () => {
    if (!selectedVehicleId) {
      setShowSelectVehicleAlert(true);
      return;
    }

    if (showHistory) {
      // Hide history - use parent's onHideHistory function
      if (onHideHistory) {
        onHideHistory();
      }
      setShowHistory(false);
    } else {
      // Show history date range modal
      setShowHistoryDateRangeModal(true);
    }
  };

  // Fungsi untuk handle pemilihan rentang waktu
  const handleSelectDateRange = (startDate, endDate) => {
    // Show history - use the parent's onHistoryClick function
    if (onHistoryClick) {
      onHistoryClick(selectedVehicleId, startDate, endDate);
      setShowHistory(true);
    } else {
      showErrorMessage("Fungsi history tidak tersedia");
    }
    setShowHistoryDateRangeModal(false);
  };

  // Fungsi untuk set geofence
  const handleSetGeofence = () => {
    if (onSetGeofence) {
      onSetGeofence();
    }
  };

  // Fungsi untuk menampilkan notifikasi relay
  const showRelayNotif = (message, status) => {
    setRelayMessage(message);
    setRelayNotifStatus(status);
    setShowRelayNotification(true);

    setTimeout(() => {
      setShowRelayNotification(false);
      setRelayMessage('');
    }, 3000);
  };

  // Fungsi untuk menyalakan mesin
  const handleEngineOn = async (vehicleId) => {
    const selectedVehicle = vehicles.find((v) => v.vehicle_id === vehicleId);
    if (!selectedVehicle) {
      showRelayNotif("Kendaraan tidak ditemukan.", "error");
      return;
    }

    // Validasi: Cek apakah mesin sudah nyala
    if (selectedVehicle.relay_status === 'ON') {
      showRelayNotif(`Mesin kendaraan ${selectedVehicle.name} sudah dalam keadaan menyala`, "error");
      return;
    }

    // Setup loading modal
    setRelayLoadingVehicleId(vehicleId);
    setRelayLoadingAction('ON');
    setRelayLoadingVehicleName(selectedVehicle.name);
    setRelayLoadingVehiclePlate(selectedVehicle.license_plate);
    setInitialRelayStatus(selectedVehicle.relay_status);
    setRelayStatusChanged(false);
    setShowRelayLoadingModal(true);

    setLoadingVehicles(prev => ({ ...prev, [vehicleId]: true }));
    try {
      // Get current user for logging command
      const currentUser = getCurrentUser();
      
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'ON',
          issued_by: currentUser?.userId || null
        }),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        // Update state kendaraan secara manual tanpa refresh
        const updatedVehicle = { ...selectedVehicle, relay_status: 'ON' };
        if (onSelectVehicle && selectedVehicleId === vehicleId) {
          onSelectVehicle(updatedVehicle);
        }
        if (onUpdateVehicle) {
          onUpdateVehicle(selectedVehicle.vehicle_id, { relay_status: 'ON' });
        }
        
      } else {
        // Tutup loading modal jika gagal
        setShowRelayLoadingModal(false);
        
        if (responseData.details && responseData.details.includes('relay fisik')) {
          showRelayNotif(`Gagal menghubungi relay kendaraan. Silakan coba lagi`, "error");
        } else {
          showRelayNotif(`Gagal menyalakan mesin: ${responseData.error || 'Terjadi kesalahan'}`, "error");
        }
      }
    } catch {
      // Tutup loading modal jika error
      setShowRelayLoadingModal(false);
      showRelayNotif(`Koneksi terputus. Silakan coba lagi`, "error");
    } finally {
      setLoadingVehicles(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  // Fungsi untuk mematikan mesin
  const handleEngineOff = async (vehicleId) => {
    const selectedVehicle = vehicles.find((v) => v.vehicle_id === vehicleId);
    if (!selectedVehicle) {
      showRelayNotif("Kendaraan tidak ditemukan.", "error");
      return;
    }

    // Validasi: Cek apakah mesin sudah mati
    if (selectedVehicle.relay_status === 'OFF') {
      showRelayNotif(`Mesin kendaraan ${selectedVehicle.name} sudah dalam keadaan mati`, "error");
      return;
    }

    // Setup loading modal
    setRelayLoadingVehicleId(vehicleId);
    setRelayLoadingAction('OFF');
    setRelayLoadingVehicleName(selectedVehicle.name);
    setRelayLoadingVehiclePlate(selectedVehicle.license_plate);
    setInitialRelayStatus(selectedVehicle.relay_status);
    setRelayStatusChanged(false);
    setShowRelayLoadingModal(true);

    setLoadingVehicles(prev => ({ ...prev, [vehicleId]: true }));
    try {
      // Get current user for logging command
      const currentUser = getCurrentUser();
      
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'OFF',
          issued_by: currentUser?.userId || null
        }),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        // Update state kendaraan secara manual tanpa refresh
        const updatedVehicle = { ...selectedVehicle, relay_status: 'OFF' };
        if (onSelectVehicle && selectedVehicleId === vehicleId) {
          onSelectVehicle(updatedVehicle);
        }
        if (onUpdateVehicle) {
          onUpdateVehicle(selectedVehicle.vehicle_id, { relay_status: 'OFF' });
        }
        
      } else {
        // Tutup loading modal jika gagal
        setShowRelayLoadingModal(false);
        
        if (responseData.details && responseData.details.includes('relay fisik')) {
          showRelayNotif(`Gagal menghubungi relay kendaraan. Silakan coba lagi`, "error");
        } else {
          showRelayNotif(`Gagal mematikan mesin: ${responseData.error || 'Terjadi kesalahan'}`, "error");
        }
      }
    } catch {
      // Tutup loading modal jika error
      setShowRelayLoadingModal(false);
      showRelayNotif(`Koneksi terputus. Silakan coba lagi`, "error");
    } finally {
      setLoadingVehicles(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  // Fungsi untuk menutup loading modal setelah status berubah
  const handleRelayLoadingComplete = () => {
    setShowRelayLoadingModal(false);
    setRelayLoadingVehicleId(null);
    setRelayLoadingAction('');
    setRelayLoadingVehicleName('');
    setRelayLoadingVehiclePlate('');
    setRelayStatusChanged(false);
    setInitialRelayStatus('');
  };

  // Fungsi untuk menampilkan konfirmasi hapus
  const handleShowDeleteConfirm = (vehicle, e) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setShowDeleteConfirm(true);
  };

  // Fungsi untuk membatalkan delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVehicleToDelete(null);
  };

  // Fungsi untuk menampilkan pesan error
  const showErrorMessage = (message) => {
    setError(message);
    setShowErrorAlert(true);
    setTimeout(() => {
      setShowErrorAlert(false);
      setError('');
    }, 3000);
  };

  // Fungsi untuk menghapus kendaraan
  const handleDeleteVehicle = async (vehicleToDelete) => {
    try {
      
      const result = await onDeleteVehicle(vehicleToDelete.vehicle_id);
      
      if (result) {
        // Reset selected vehicle if it was the one being deleted
        if (selectedVehicle?.vehicle_id === vehicleToDelete.vehicle_id) {
          onSelectVehicle(null);
        }
        
        setSuccessMessage(`Kendaraan ${vehicleToDelete.name} berhasil dihapus!`);
        setShowSuccessNotification(true);
        
        // Hide success alert after 3 seconds
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      showErrorMessage(`Gagal menghapus kendaraan: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
    }
  };

  // Fungsi untuk toggle geofence visibility
  const handleToggleGeofence = (vehicleId) => {
    // Default state adalah false (hidden), toggle sesuai dengan state saat ini
    const currentVisibility = vehicleGeofenceVisibility[vehicleId] || false;
    const newVisibility = !currentVisibility;
    
    setVehicleGeofenceVisibility(prev => {
      const newState = {
        ...prev,
        [vehicleId]: newVisibility
      };
      return newState;
    });
    
    // Notify parent component
    if (onToggleGeofence) {
      onToggleGeofence(vehicleId, newVisibility);
    }
  };

  return (
    <>
    <div className="w-64 bg-white shadow-md h-screen flex flex-col p-3">
      {/* Logo aplikasi */}
      <div className="flex justify-center mb-2 mt-1">
        <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={100} height={32} />
      </div>

      <h2 className="text-center font-bold text-base mb-2">Daftar Kendaraan</h2>

      {/* Daftar kendaraan */}
      <div className="flex-grow overflow-y-auto">
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => {
              // Find matching vehicle data for speed and RPM
              const latestVehicleData = getVehicleDataByGpsId(vehicle.gps_id);
            
            return (
            <div
              key={vehicle.vehicle_id}
              className={`p-2 mb-2 rounded cursor-pointer relative ${
                selectedVehicleId === vehicle.vehicle_id ? "bg-blue-100" : "bg-gray-200"
              }`}
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="font-bold mb-0.5 text-sm text-black">{vehicle.name || 'Tidak ada nama'}</p>
                    <p className="text-xs text-black mb-0.5">{vehicle.license_plate}</p>
                    <p className="text-xs text-black mb-0.5">{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-black mb-0.5">Tahun {vehicle.year}</p>
                    
                  {vehicle.sim_card_number && (
                      <p className="text-xs text-black mb-0.5">SIM Card: {vehicle.sim_card_number}</p>
                  )}   
                    {vehicle.relay_status && (
                      <p className="text-xs text-black mb-0.5">
                      Status Mesin: {
                          vehicle.relay_status === 'ON'
                          ? <span className="text-green-600 font-semibold">ON</span>
                          : <span className="text-red-600 font-semibold">OFF</span>
                      }
                    </p>
                  )}
                  
                    {/* Data kendaraan real-time (speed) - selalu tampil */}
                    <div className="text-xs text-black mb-1">
                      <p className="mb-0.5">
                        Kecepatan: <span className="text-blue-600 font-semibold">{latestVehicleData?.speed || 0} km/h</span>
                      </p>
                      <p className="mb-1">
                        Status: <span className={`font-semibold ${latestVehicleData?.speed > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {latestVehicleData?.speed > 0 ? 'MOVED' : 'PARKED'}
                        </span>
                      </p>
                    </div>
                    
                    {/* Button controls - GEO, ENGINE ON/OFF */}
                    <div className="flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGeofence(vehicle.vehicle_id);
                      }}
                      className={`${
                        vehicleGeofenceVisibility[vehicle.vehicle_id] === true
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-blue-400 hover:bg-blue-500'
                      } text-white rounded text-center font-bold transition-colors duration-200 px-1.5 py-0.5 text-xs`}
                        title={`${vehicleGeofenceVisibility[vehicle.vehicle_id] === true ? 'Sembunyikan' : 'Tampilkan'} geofence untuk ${vehicle.name}`}
                        >
                        GEO
                        </button>

                        {/* Engine ON Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEngineOn(vehicle.vehicle_id);
                          }}
                          disabled={loadingVehicles[vehicle.vehicle_id] || vehicle.relay_status === 'ON'}
                          className={`${
                            loadingVehicles[vehicle.vehicle_id] ? 'bg-gray-400' : 
                            vehicle.relay_status === 'ON' ? 'bg-gray-500' :
                            'bg-green-500 hover:bg-green-600'
                          } text-white rounded text-center font-bold transition-colors duration-200 px-1.5 py-0.5 text-xs`}
                          title={vehicle.relay_status === 'ON' ? 'Mesin sudah menyala' : 'Nyalakan mesin'}
                        >
                          {loadingVehicles[vehicle.vehicle_id] ? '...' : 'ON'}
                        </button>

                        {/* Engine OFF Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEngineOff(vehicle.vehicle_id);
                          }}
                          disabled={loadingVehicles[vehicle.vehicle_id] || vehicle.relay_status === 'OFF'}
                          className={`${
                            loadingVehicles[vehicle.vehicle_id] ? 'bg-gray-400' : 
                            vehicle.relay_status === 'OFF' ? 'bg-gray-500' :
                            'bg-red-500 hover:bg-red-600'
                          } text-white rounded text-center font-bold transition-colors duration-200 px-1.5 py-0.5 text-xs`}
                          title={vehicle.relay_status === 'OFF' ? 'Mesin sudah mati' : 'Matikan mesin'}
                        >
                          {loadingVehicles[vehicle.vehicle_id] ? '...' : 'OFF'}
                    </button>
                      </div>

                  </div>
                    
                  {/* Button hapus kendaraan - tetap di pojok kanan */}
                  <button 
                    onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors duration-200 absolute top-1 right-1"
                    title={`Hapus kendaraan ${vehicle.name}`}
                  >
                    ×
                  </button>
              </div>
            </div>
          )})
        ) : (
          <p className="text-center text-gray-500 text-xs">Tidak ada kendaraan</p>
        )}
      </div>

      {/* Tombol aksi */}
      <div className="mt-2 space-y-2">
        <button 
          onClick={onTambahKendaraan} 
          className="w-full py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 transition-colors duration-200"
        >
          TAMBAH KENDARAAN
        </button>
        
        <button 
          onClick={handleSetGeofence}
          className="w-full py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 transition-colors duration-200"
        >
          SET GEOFENCE
        </button>
        
        <button 
          onClick={handleHistoryClick} 
          className="w-full py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 transition-colors duration-200"
        >
          {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
        </button>
      </div>
      </div>

      {/* Modal peringatan pilih kendaraan - diperbesar sedikit */}
      {showSelectVehicleAlert && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm">
            <h3 className="text-base font-bold mb-3 text-red-500 text-center">Peringatan</h3>
            <p className="mb-3 text-center text-sm">
              Anda harus memilih kendaraan terlebih dahulu untuk melihat history perjalanan
            </p>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setShowSelectVehicleAlert(false)}
                className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal notifikasi tidak ada history - dikecilkan */}
      {showNoHistoryAlert && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-3 rounded shadow-lg max-w-xs">
            <h3 className="text-sm font-bold mb-2 text-red-500">⚠️ Tidak Ada History</h3>
            <p className="mb-2 text-xs">
              Kendaraan <strong>
                {vehicles.find(v => v.vehicle_id === selectedVehicleId)?.name} (
                {vehicles.find(v => v.vehicle_id === selectedVehicleId)?.license_plate})
              </strong> tidak memiliki data lokasi. History perjalanan tidak tersedia.
            </p>
            <div className="flex justify-end mt-3">
              <button 
                onClick={() => setShowNoHistoryAlert(false)}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal konfirmasi hapus - dikecilkan */}
      {showDeleteConfirm && vehicleToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded shadow-2xl max-w-sm w-full mx-2">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 text-red-500 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-sm font-bold mb-2 text-gray-800">Konfirmasi Hapus Kendaraan</h3>
              
              <div className="mb-3">
                <p className="text-gray-600 mb-1 text-xs">
                  Apakah Anda yakin ingin menghapus kendaraan:
                </p>
                <div className="bg-gray-50 p-1 rounded">
                  <p className="font-semibold text-gray-800 text-xs">{vehicleToDelete.name}</p>
                  <p className="text-xs text-gray-600">Nomor: {vehicleToDelete.license_plate}</p>
                  <p className="text-xs text-gray-600">{vehicleToDelete.make} {vehicleToDelete.model}</p>
                </div>
                <p className="text-red-600 text-xs mt-1 font-medium">
                  ⚠️ Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
              
              <div className="flex flex-col gap-1 justify-center">
              <button 
                onClick={handleCancelDelete}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors duration-200 font-medium"
              >
                Batal
              </button>
              <button 
                  onClick={() => handleDeleteVehicle(vehicleToDelete)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors duration-200 font-medium"
              >
                  Ya, Hapus Kendaraan
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}

      {/* Modal notifikasi sukses */}
      {showSuccessNotification && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-green-600 text-center">Berhasil Menghapus Kendaraan!</h3>
            <p className="mb-4">{successMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowSuccessNotification(false)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal notifikasi relay */}
      {showRelayNotification && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className={`text-lg font-bold mb-4 ${
              relayNotifStatus === 'success' ? 'text-green-600' : 'text-red-500'
            }`}>
              {relayNotifStatus === 'success' ? 'Berhasil' : 'Gagal'}
            </h3>
            <p className="mb-4 whitespace-pre-line">{relayMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowRelayNotification(false)}
                className={`px-4 py-2 ${
                  relayNotifStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                } text-white rounded-md transition-colors duration-200`}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notifikasi Error */}
      {showErrorAlert && createPortal(
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>,
        document.body
      )}

      {/* Modal Loading Relay - Menunggu Status Berubah */}
      {showRelayLoadingModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <div className="text-center">
              <div className="mb-4">
                {relayStatusChanged ? (
                  // Icon sukses ketika status sudah berubah
                  <div className="mx-auto h-12 w-12 text-green-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  // Spinner loading ketika masih menunggu
                  <svg className="animate-spin mx-auto h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
              
              <h3 className={`text-lg font-bold mb-4 ${relayStatusChanged ? 'text-green-600' : 'text-blue-600'}`}>
                {relayStatusChanged ? 'Berhasil!' : 'Mohon Tunggu...'}
              </h3>
              
              <p className="mb-4 text-gray-700">
                {relayStatusChanged 
                  ? `Status mesin kendaraan ${relayLoadingVehicleName} ${relayLoadingVehiclePlate} sudah ${relayLoadingAction}`
                  : (
                      <span>
                        Sedang {relayLoadingAction === 'ON' ? 'menyalakan' : 'mematikan'} mesin kendaraan {relayLoadingVehicleName}
                        <br />
                        <strong>{relayLoadingVehiclePlate}</strong>
                      </span>
                    )
                }
              </p>
              
              {!relayStatusChanged && (
                <div className="text-sm text-gray-500 mb-4">
                  Menunggu konfirmasi dari relay
                </div>
              )}
              
              <div className="flex justify-center mt-6">
                <button 
                  onClick={handleRelayLoadingComplete}
                  disabled={!relayStatusChanged}
                  className={`px-6 py-2 rounded-md transition-colors duration-200 ${
                    relayStatusChanged 
                      ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {relayStatusChanged ? 'OK' : 'Menunggu...'}
                </button>
              </div>
            </div>
        </div>
        </div>,
        document.body
      )}

      {/* Modal History Date Range */}
      {showHistoryDateRangeModal && createPortal(
        <ModalHistoryDateRange
          onClose={() => setShowHistoryDateRangeModal(false)}
          onSelectDateRange={handleSelectDateRange}
        />,
        document.body
      )}
    </>
  );
};

export default SidebarComponent;