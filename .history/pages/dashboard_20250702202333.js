'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { getCurrentUser } from "@/lib/authService";
import { useWebSocket } from '@/lib/hooks/useWebSocket';

// Modal History Date Range
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
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      setError('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
      return;
    }

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
  const [relayLoadingAction, setRelayLoadingAction] = useState('');
  const [relayLoadingVehicleName, setRelayLoadingVehicleName] = useState('');
  const [relayLoadingVehiclePlate, setRelayLoadingVehiclePlate] = useState('');
  const [relayStatusChanged, setRelayStatusChanged] = useState(false);
  const [initialRelayStatus, setInitialRelayStatus] = useState('');

  // State untuk vehicle data dari WebSocket
  const [vehicleData, setVehicleData] = useState([]);

  // State untuk sidebar visibility dan active panel
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activePanel, setActivePanel] = useState('vehicles');

  // Gunakan WebSocket untuk real-time data
  const { data: wsData, isConnected } = useWebSocket();

  // Update vehicle data ketika WebSocket mengirim data baru
  useEffect(() => {
    if (wsData && wsData.data && Array.isArray(wsData.data)) {
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
        setRelayStatusChanged(true);
      }
    }
  }, [vehicles, relayLoadingVehicleId, initialRelayStatus, showRelayLoadingModal]);

  // Toggle panel
  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Calculate sidebar width
  const getSidebarWidth = () => {
    if (!isSidebarVisible) return 0;
    return activePanel ? 320 : 64;
  };

  // Helper function untuk mendapatkan data kendaraan berdasarkan gps_id
  const getVehicleDataByGpsId = (gpsId) => {
    return vehicleData.find(data => data.gps_id === gpsId) || null;
  };

  // Fungsi untuk memilih kendaraan
  const handleSelectVehicle = (vehicle) => {
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
      if (onHideHistory) {
        onHideHistory();
      }
      setShowHistory(false);
    } else {
      setShowHistoryDateRangeModal(true);
    }
  };

  // Fungsi untuk handle pemilihan rentang waktu
  const handleSelectDateRange = (startDate, endDate) => {
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

    if (selectedVehicle.relay_status === 'ON') {
      showRelayNotif(`Mesin kendaraan ${selectedVehicle.name} sudah dalam keadaan menyala`, "error");
      return;
    }

    setRelayLoadingVehicleId(vehicleId);
    setRelayLoadingAction('ON');
    setRelayLoadingVehicleName(selectedVehicle.name);
    setRelayLoadingVehiclePlate(selectedVehicle.license_plate);
    setInitialRelayStatus(selectedVehicle.relay_status);
    setRelayStatusChanged(false);
    setShowRelayLoadingModal(true);

    setLoadingVehicles(prev => ({ ...prev, [vehicleId]: true }));
    try {
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
        const updatedVehicle = { ...selectedVehicle, relay_status: 'ON' };
        if (onSelectVehicle && selectedVehicleId === vehicleId) {
          onSelectVehicle(updatedVehicle);
        }
        if (onUpdateVehicle) {
          onUpdateVehicle(selectedVehicle.vehicle_id, { relay_status: 'ON' });
        }
      } else {
        setShowRelayLoadingModal(false);
        
        if (responseData.details && responseData.details.includes('relay fisik')) {
          showRelayNotif(`Gagal menghubungi relay kendaraan. Silakan coba lagi`, "error");
        } else {
          showRelayNotif(`Gagal menyalakan mesin: ${responseData.error || 'Terjadi kesalahan'}`, "error");
        }
      }
    } catch {
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

    if (selectedVehicle.relay_status === 'OFF') {
      showRelayNotif(`Mesin kendaraan ${selectedVehicle.name} sudah dalam keadaan mati`, "error");
      return;
    }

    setRelayLoadingVehicleId(vehicleId);
    setRelayLoadingAction('OFF');
    setRelayLoadingVehicleName(selectedVehicle.name);
    setRelayLoadingVehiclePlate(selectedVehicle.license_plate);
    setInitialRelayStatus(selectedVehicle.relay_status);
    setRelayStatusChanged(false);
    setShowRelayLoadingModal(true);

    setLoadingVehicles(prev => ({ ...prev, [vehicleId]: true }));
    try {
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
        const updatedVehicle = { ...selectedVehicle, relay_status: 'OFF' };
        if (onSelectVehicle && selectedVehicleId === vehicleId) {
          onSelectVehicle(updatedVehicle);
        }
        if (onUpdateVehicle) {
          onUpdateVehicle(selectedVehicle.vehicle_id, { relay_status: 'OFF' });
        }
      } else {
        setShowRelayLoadingModal(false);
        
        if (responseData.details && responseData.details.includes('relay fisik')) {
          showRelayNotif(`Gagal menghubungi relay kendaraan. Silakan coba lagi`, "error");
        } else {
          showRelayNotif(`Gagal mematikan mesin: ${responseData.error || 'Terjadi kesalahan'}`, "error");
        }
      }
    } catch {
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
        if (selectedVehicle?.vehicle_id === vehicleToDelete.vehicle_id) {
          onSelectVehicle(null);
        }
        
        setSuccessMessage(`Kendaraan ${vehicleToDelete.name} berhasil dihapus!`);
        setShowSuccessNotification(true);
        
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
    const currentVisibility = vehicleGeofenceVisibility[vehicleId] || false;
    const newVisibility = !currentVisibility;
    
    setVehicleGeofenceVisibility(prev => {
      const newState = {
        ...prev,
        [vehicleId]: newVisibility
      };
      return newState;
    });
    
    if (onToggleGeofence) {
      onToggleGeofence(vehicleId, newVisibility);
    }
  };

  // Panel content renderer
  const renderPanelContent = () => {
    switch(activePanel) {
      case 'vehicles':
        return (
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Kendaraan</h3>
            
            {/* Daftar kendaraan */}
            <div className="flex-grow overflow-y-auto mb-4">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => {
                  const latestVehicleData = getVehicleDataByGpsId(vehicle.gps_id);
                
                  return (
                    <div
                      key={vehicle.vehicle_id}
                      className={`p-3 mb-3 rounded-lg cursor-pointer relative transition-all duration-200 ${
                        selectedVehicleId === vehicle.vehicle_id 
                          ? "bg-blue-50 border-2 border-blue-200" 
                          : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                      }`}
                      onClick={() => handleSelectVehicle(vehicle)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <p className="font-bold mb-1 text-sm text-black">{vehicle.name || 'Tidak ada nama'}</p>
                          <p className="text-sm text-gray-600 mb-1">{vehicle.license_plate}</p>
                          <p className="text-sm text-gray-600 mb-1">{vehicle.make} {vehicle.model}</p>
                          <p className="text-sm text-gray-600 mb-1">Tahun {vehicle.year}</p>
                          
                          {vehicle.sim_card_number && (
                            <p className="text-sm text-gray-600 mb-1">SIM Card: {vehicle.sim_card_number}</p>
                          )}   
                          
                          {vehicle.relay_status && (
                            <p className="text-sm text-gray-600 mb-1">
                              Status Mesin: {
                                vehicle.relay_status === 'ON'
                                ? <span className="text-green-600 font-semibold">ON</span>
                                : <span className="text-red-600 font-semibold">OFF</span>
                              }
                            </p>
                          )}
                          
                          {/* Data kendaraan real-time */}
                          <div className="text-sm text-gray-600 mb-2">
                            <p className="mb-1">
                              Kecepatan: <span className="text-blue-600 font-semibold">{latestVehicleData?.speed || 0} km/h</span>
                            </p>
                            <p className="mb-2">
                              Status: <span className={`font-semibold ${latestVehicleData?.speed > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {latestVehicleData?.speed > 0 ? 'MOVED' : 'PARKED'}
                              </span>
                            </p>
                          </div>
                          
                          {/* Button controls */}
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleGeofence(vehicle.vehicle_id);
                              }}
                              className={`${
                                vehicleGeofenceVisibility[vehicle.vehicle_id] === true
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-blue-400 hover:bg-blue-500'
                              } text-white rounded text-center font-bold transition-colors duration-200 px-2 py-1 text-xs`}
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
                              } text-white rounded text-center font-bold transition-colors duration-200 px-2 py-1 text-xs`}
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
                              } text-white rounded text-center font-bold transition-colors duration-200 px-2 py-1 text-xs`}
                              title={vehicle.relay_status === 'OFF' ? 'Mesin sudah mati' : 'Matikan mesin'}
                            >
                              {loadingVehicles[vehicle.vehicle_id] ? '...' : 'OFF'}
                            </button>
                          </div>
                        </div>
                          
                        {/* Button hapus kendaraan */}
                        <button 
                          onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors duration-200 absolute top-2 right-2"
                          title={`Hapus kendaraan ${vehicle.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-gray-500 text-sm">Tidak ada kendaraan</p>
              )}
            </div>

            {/* Tombol aksi - sticky di bawah */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <button 
                onClick={onTambahKendaraan} 
                className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors duration-200"
              >
                TAMBAH KENDARAAN
              </button>
              
              <button 
                onClick={handleSetGeofence}
                className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors duration-200"
              >
                SET GEOFENCE
              </button>
              
              <button 
                onClick={handleHistoryClick} 
                className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors duration-200"
              >
                {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
              </button>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Overview</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900">Total Kendaraan</h4>
                <p className="text-2xl font-bold text-blue-600 mt-1">{vehicles.length}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-900">Kendaraan Aktif</h4>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {vehicles.filter(v => {
                    const data = getVehicleDataByGpsId(v.gps_id);
                    return data?.speed > 0;
                  }).length}
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-orange-900">Kendaraan Parkir</h4>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {vehicles.filter(v => {
                    const data = getVehicleDataByGpsId(v.gps_id);
                    return data?.speed === 0 || !data;
                  }).length}
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-red-900">Mesin ON</h4>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {vehicles.filter(v => v.relay_status === 'ON').length}
                </p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Koneksi WebSocket</h4>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{isConnected ? 'Terhubung' : 'Terputus'}</span>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Data Real-time</h4>
                <p className="text-xs text-gray-600">
                  Update terakhir: {vehicleData.length > 0 ? 'Aktif' : 'Tidak ada data'}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Sidebar - Floating style with proper z-index */}
      <aside className={`fixed top-0 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl z-40 transition-all duration-300 ${
        isSidebarVisible ? 'left-0' : (activePanel ? '-left-16' : '-left-80')
      }`}>
        <div className="flex h-full">
          {/* Icon Sidebar */}
          <div className="w-16 flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-center">
                <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={32} height={32} />
              </div>
            </div>

            {/* Navigation Icons */}
            <nav className="flex-1 p-2">
              <div className="space-y-2">
                {/* Dashboard */}
                <button 
                  onClick={() => togglePanel('dashboard')}
                  className={`w-full p-3 rounded-lg transition-colors relative group ${
                    activePanel === 'dashboard' ? 'text-white bg-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10m-9 4h.01" />
                  </svg>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Dashboard
                    </div>
                  )}
                </button>

                {/* Vehicles */}
                <button 
                  onClick={() => togglePanel('vehicles')}
                  className={`w-full p-3 rounded-lg transition-colors relative group ${
                    activePanel === 'vehicles' ? 'text-white bg-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Kendaraan
                    </div>
                  )}
                </button>

                {/* Settings */}
                <button 
                  onClick={() => togglePanel('settings')}
                  className={`w-full p-3 rounded-lg transition-colors relative group ${
                    activePanel === 'settings' ? 'text-white bg-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pengaturan
                    </div>
                  )}
                </button>
              </div>
            </nav>
          </div>

          {/* Detail Panel */}
          {activePanel && (
            <div className="w-64 border-l border-gray-200 bg-white p-4 overflow-y-auto">
              {renderPanelContent()}
            </div>
          )}
        </div>
      </aside>

      {/* Toggle Button - Floating over map with higher z-index */}
      <button
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className="fixed top-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-200 z-50"
        style={{
          left: isSidebarVisible 
            ? `${getSidebarWidth() + 16}px`
            : activePanel 
              ? '272px'
              : '24px'
        }}
      >
        {isSidebarVisible ? (
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Modal peringatan pilih kendaraan */}
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

      {/* Modal notifikasi tidak ada history */}
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

      {/* Modal konfirmasi hapus */}
      {showDeleteConfirm && vehicleToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded-lg shadow-2xl max-w-xs w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 text-red-500 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold mb-3 text-gray-800">Konfirmasi Hapus Kendaraan</h3>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2 text-sm">
                  Apakah Anda yakin ingin menghapus kendaraan:
                </p>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="font-semibold text-gray-800 text-sm">{vehicleToDelete.name}</p>
                  <p className="text-xs text-gray-600">Nomor: {vehicleToDelete.license_plate}</p>
                  <p className="text-xs text-gray-600">{vehicleToDelete.make} {vehicleToDelete.model}</p>
                </div>
                <p className="text-red-600 text-xs mt-2 font-medium">
                  Kendaraan yang dihapus tidak dapat dikembalikan
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button 
                  onClick={handleCancelDelete}
                  className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 font-medium text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleDeleteVehicle(vehicleToDelete)}
                  className="px-4 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium text-sm"
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
          <div className="bg-white p-3 rounded-md shadow-lg max-w-xs">
            <h3 className="text-base font-bold mb-2 text-green-600 text-center">Berhasil Menghapus Kendaraan!</h3>
            <p className="mb-3 text-sm">{successMessage}</p>
            <div className="flex justify-end mt-3">
              <button 
                onClick={() => setShowSuccessNotification(false)}
                className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-sm"
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

      {/* Modal Loading Relay */}
      {showRelayLoadingModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded shadow-lg max-w-[200px] w-full mx-2">
            <div className="text-center">
              <div className="mb-2">
                {relayStatusChanged ? (
                  <div className="mx-auto h-8 w-8 text-green-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <svg className="animate-spin mx-auto h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
              
              <h3 className={`text-base font-bold mb-2 ${relayStatusChanged ? 'text-green-600' : 'text-blue-600'}`}>
                {relayStatusChanged ? 'Berhasil!' : 'Mohon Tunggu...'}
              </h3>
              
              <p className="mb-2 text-gray-700 text-sm">
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
                <div className="text-xs text-gray-500 mb-2">
                  Menunggu konfirmasi dari relay
                </div>
              )}
              
              <div className="flex justify-center mt-3">
                <button 
                  onClick={handleRelayLoadingComplete}
                  disabled={!relayStatusChanged}
                  className={`px-4 py-1 rounded text-sm transition-colors duration-200 ${
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

      {/* Global styles */}
      <style jsx global>{`
        /* Hide scrollbar */
        aside::-webkit-scrollbar {
          display: none;
        }
        aside {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default SidebarComponent;