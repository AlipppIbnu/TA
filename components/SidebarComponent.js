//SidebarComponent

'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Image from "next/image";
import { logout } from "@/lib/authService";
import { deleteVehicle } from "@/lib/vehicleService";
import { getGeofenceStatus } from "@/utils/geofenceUtils";
import useSWR from 'swr';

// SWR fetcher for vehicle data
const vehicleDataFetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data || [];
};

const SidebarComponent = ({ 
  vehicles = [], 
  onSelectVehicle, 
  onTambahKendaraan, 
  onDeleteVehicle,
  onSetGeofence,
  onHistoryClick,
  onHideHistory,
  selectedVehicle,
  geofences = [],
  onToggleGeofence,
  onUpdateVehicle
}) => {
  const router = useRouter();
  
  // State untuk kendaraan
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
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
  const [relays, setRelays] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState({});
  
  // State baru untuk loading modal relay
  const [showRelayLoadingModal, setShowRelayLoadingModal] = useState(false);
  const [relayLoadingVehicleId, setRelayLoadingVehicleId] = useState(null);
  const [relayLoadingAction, setRelayLoadingAction] = useState(''); // 'ON' atau 'OFF'
  const [relayLoadingVehicleName, setRelayLoadingVehicleName] = useState('');
  const [relayLoadingVehiclePlate, setRelayLoadingVehiclePlate] = useState('');
  const [relayStatusChanged, setRelayStatusChanged] = useState(false);
  const [initialRelayStatus, setInitialRelayStatus] = useState('');

  // SWR untuk mengambil data kendaraan real-time (speed, RPM, dll)
  const { 
    data: vehicleData, 
    error: vehicleDataError 
  } = useSWR(
    'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055/items/vehicle_datas',
    vehicleDataFetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

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

  // Fungsi untuk logout
  const handleLogout = async () => {
    try {
      await logout();
      // Pastikan redirect terjadi setelah logout selesai
        window.location.href = "/auth/login";
    } catch (error) {
        console.error("Logout Error:", error);
    }
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
      showErrorMessage("Pilih kendaraan terlebih dahulu.");
      return;
    }

    if (showHistory) {
      // Hide history - use parent's onHideHistory function
      if (onHideHistory) {
        onHideHistory();
      }
      setShowHistory(false);
    } else {
      // Show history - use the parent's onHistoryClick function
      if (onHistoryClick) {
        onHistoryClick(selectedVehicleId);
        setShowHistory(true);
      } else {
        showErrorMessage("Fungsi history tidak tersedia");
      }
    }
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
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'ON'
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
    } catch (error) {
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
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicle_id}/relay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relay_status: 'OFF'
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
    } catch (error) {
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

  // Fungsi untuk menampilkan pesan sukses
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
    setTimeout(() => {
      setShowSuccessNotification(false);
      setSuccessMessage('');
    }, 3000);
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

  // Komponen loading spinner
  const LoadingSpinner = () => (
    <>
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      LOADING...
    </>
  );

  // Fungsi untuk mendapatkan status relay kendaraan terpilih
  const getSelectedVehicleRelayStatus = () => {
    if (!selectedVehicleId) return null;

    const selectedVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId);
    if (!selectedVehicle) return null;

    return selectedVehicle.relay_status;
  };

  const selectedRelayStatus = getSelectedVehicleRelayStatus();

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

  // Fungsi untuk mendapatkan geofences untuk kendaraan tertentu (Vehicle-Centric)
  const getVehicleGeofences = (vehicleId) => {
    // Cari vehicle berdasarkan vehicleId
    const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
    
    // Jika vehicle tidak ada atau tidak punya geofence_id, return empty array
    if (!vehicle || !vehicle.geofence_id) {
      return [];
    }
    
    // Cari geofence berdasarkan geofence_id yang dimiliki vehicle
    return geofences.filter(geofence => geofence.geofence_id === vehicle.geofence_id);
  };

  // Fungsi untuk cek apakah kendaraan memiliki geofence
  const hasGeofence = (vehicleId) => {
    return getVehicleGeofences(vehicleId).length > 0;
  };

  return (
    <>
    <div className="w-80 bg-white shadow-md h-screen flex flex-col p-4">
      {/* Logo aplikasi */}
      <div className="flex justify-center mb-6 mt-4">
        <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={150} height={50} />
      </div>

      <h2 className="text-center font-bold text-lg mb-3">Daftar Kendaraan</h2>

      {/* Daftar kendaraan */}
      <div className="flex-grow overflow-y-auto">
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => {
            const geofenceStatus = getGeofenceStatus(vehicle, geofences);
              
              // Find matching vehicle data for speed and RPM
              const latestVehicleData = vehicleData?.find(data => data.gps_id === vehicle.gps_id);
            
            return (
            <div
              key={vehicle.vehicle_id}
              className={`p-3 mb-2 rounded-md cursor-pointer relative ${
                selectedVehicleId === vehicle.vehicle_id ? "bg-blue-200" : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold mb-1">{vehicle.name || 'Tidak ada nama'}</p>
                    <p className="text-sm text-black mb-1">{vehicle.license_plate}</p>
                    <p className="text-sm text-black mb-1">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-black mb-2">Tahun {vehicle.year}</p>
                    
                  {vehicle.sim_card_number && (
                      <p className="text-sm text-black mb-1">SIM Card: {vehicle.sim_card_number}</p>
                  )}
                  {vehicle.gps_device_id && (
                      <p className="text-sm text-black mb-1">GPS Device: {vehicle.gps_device_id}</p>
                  )}
                  {vehicle.position && (
                      <p className="text-sm text-black mb-2">
                      Koordinat: {`${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}`}
                  </p>
                  )}
                    
                    {vehicle.relay_status && (
                      <p className="text-sm text-black mb-2">
                      Status Mesin: {
                          vehicle.relay_status === 'ON'
                          ? <span className="text-green-600 font-semibold">ON</span>
                          : <span className="text-red-600 font-semibold">OFF</span>
                      }
                    </p>
                  )}
                  
                    {/* Data kendaraan real-time (speed) - selalu tampil */}
                    <div className="text-sm text-black mt-2 mb-2">
                      <p className="mb-1">
                        Kecepatan: <span className="text-blue-600 font-semibold">{latestVehicleData?.speed || 0} km/h</span>
                      </p>
                      {latestVehicleData?.fuel_level && (
                        <p className="mb-1">
                          Bahan Bakar: <span className="text-orange-600 font-semibold">{latestVehicleData.fuel_level}%</span>
                    </p>
                  )}
                </div>
                    
                    {/* Button controls - GEO, ENGINE ON/OFF */}
                    <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGeofence(vehicle.vehicle_id);
                      }}
                      className={`${
                        vehicleGeofenceVisibility[vehicle.vehicle_id] === true
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-blue-400 hover:bg-blue-500'
                      } text-white rounded text-center font-bold transition-colors duration-200 w-10 h-6 text-[10px] flex items-center justify-center`}
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
                          } text-white rounded text-center font-bold transition-colors duration-200 w-10 h-6 text-[10px] flex items-center justify-center`}
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
                          } text-white rounded text-center font-bold transition-colors duration-200 w-12 h-6 text-[10px] flex items-center justify-center`}
                          title={vehicle.relay_status === 'OFF' ? 'Mesin sudah mati' : 'Matikan mesin'}
                        >
                          {loadingVehicles[vehicle.vehicle_id] ? '...' : 'OFF'}
                    </button>
                      </div>


                  </div>
                    
                  {/* Button hapus kendaraan - tetap di pojok kanan */}
                  <button 
                    onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200"
                    title={`Hapus kendaraan ${vehicle.name}`}
                  >
                    ×
                  </button>
              </div>
            </div>
          )})
        ) : (
          <p className="text-center text-gray-500">Tidak ada kendaraan</p>
        )}
      </div>

      {/* Tombol aksi */}
      <div className="mt-4 space-y-2">
        <button 
          onClick={onTambahKendaraan} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          TAMBAH KENDARAAN
        </button>
        
        <button 
          onClick={handleSetGeofence}
          className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors duration-200"
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
      </div>

      {/* Modal peringatan pilih kendaraan */}
      {showSelectVehicleAlert && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-500 text-center">Peringatan</h3>
            <p className="mb-4 text-center">
              Anda harus memilih kendaraan terlebih dahulu untuk melihat history perjalanan.
            </p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowSelectVehicleAlert(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal notifikasi tidak ada history */}
      {showNoHistoryAlert && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-500">⚠️ Tidak Ada History</h3>
            <p className="mb-4">
              Kendaraan <strong>
                {vehicles.find(v => v.vehicle_id === selectedVehicleId)?.name} (
                {vehicles.find(v => v.vehicle_id === selectedVehicleId)?.license_plate})
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
        </div>,
        document.body
      )}

      {/* Modal konfirmasi hapus */}
      {showDeleteConfirm && vehicleToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 text-red-500 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-16 h-16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi Hapus Kendaraan</h3>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Apakah Anda yakin ingin menghapus kendaraan:
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-semibold text-gray-800">{vehicleToDelete.name}</p>
                  <p className="text-sm text-gray-600">Nomor: {vehicleToDelete.license_plate}</p>
                  <p className="text-sm text-gray-600">{vehicleToDelete.make} {vehicleToDelete.model}</p>
                </div>
                <p className="text-red-600 text-sm mt-3 font-medium">
                  ⚠️ Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={handleCancelDelete}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 font-medium"
              >
                Batal
              </button>
              <button 
                  onClick={() => handleDeleteVehicle(vehicleToDelete)}
                  className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    </>
  );
};

export default SidebarComponent;