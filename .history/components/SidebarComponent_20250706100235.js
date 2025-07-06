'use client';

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { getCurrentUser, logout } from "@/lib/authService";
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useRouter } from "next/router";

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
  onUpdateVehicle,
  onSidebarStateChange // NEW: Callback untuk mengirim state ke parent
}) => {
  
  const router = useRouter();
  
  // Get current user info
  const currentUser = getCurrentUser();
  
  // Helper function to get user initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
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
  const [successAction, setSuccessAction] = useState(''); // 'vehicle' atau 'notification'
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
  const [activePanel, setActivePanel] = useState(null);

  // Gunakan WebSocket untuk real-time data
  const { data: wsData, isConnected } = useWebSocket();

  // State untuk modal logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // State untuk notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    areaViolations: 0,
    exitViolations: 0
  });
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Memoized function to calculate sidebar width
  const getSidebarWidth = useCallback(() => {
    if (!isSidebarVisible) return 0;
    return activePanel ? 320 : 64;
  }, [isSidebarVisible, activePanel]);

  // NEW: Effect untuk mengirim state ke parent component (untuk basemap alignment)
  useEffect(() => {
    if (onSidebarStateChange) {
      onSidebarStateChange({
        isSidebarVisible,
        activePanel,
        sidebarWidth: getSidebarWidth()
      });
    }
  }, [isSidebarVisible, activePanel, getSidebarWidth, onSidebarStateChange]);

  // Fungsi untuk logout
  const handleLogout = () => {
    setShowLogoutConfirm(true); // Tampilkan modal konfirmasi custom
  };

  // Fungsi untuk konfirmasi logout
  const confirmLogout = () => {
    logout();
    router.push('/'); // Redirect ke index.js (home page)
    setShowLogoutConfirm(false);
  };

  // Fungsi untuk membatalkan logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Fungsi untuk fetch notifications
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      
      const user = getCurrentUser();
      if (!user) return;
      
      const response = await fetch(`/api/alerts?limit=1000&sort=-timestamp&user_id=${user.userId}`);
      const data = await response.json();

      if (data.success || data.data) {
        const alertsData = data.data || [];
        setNotifications(alertsData);
        
        // Calculate statistics
        const total = alertsData.length;
        const areaViolations = alertsData.filter(alert => alert.alert_type === 'violation_enter').length;
        const exitViolations = alertsData.filter(alert => alert.alert_type === 'violation_exit').length;
        
        setNotificationStats({
          total,
          areaViolations,
          exitViolations
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showErrorMessage('Gagal memuat notifikasi');
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fungsi untuk filter notifications
  const getFilteredNotifications = () => {
    if (notificationFilter === 'area_terlarang') {
      return notifications.filter(n => n.alert_type === 'violation_enter');
    } else if (notificationFilter === 'keluar_area_wajib') {
      return notifications.filter(n => n.alert_type === 'violation_exit');
    }
    return notifications;
  };

  // Fungsi untuk hapus semua notifications
  const handleDeleteAllNotifications = async () => {
    try {
      setIsDeletingAll(true);
      
      const user = getCurrentUser();
      if (!user) return;
      
      const response = await fetch('/api/alerts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.userId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications([]);
        setNotificationStats({
          total: 0,
          areaViolations: 0,
          exitViolations: 0
        });
        setNotificationFilter('all');
        
        setSuccessMessage(`Berhasil menghapus ${data.deleted_count} notifikasi`);
        setSuccessAction('notification');
        setShowSuccessNotification(true);
      } else {
        showErrorMessage('Gagal menghapus notifikasi: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      showErrorMessage('Terjadi kesalahan saat menghapus notifikasi');
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

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

  // Monitor vehicles prop changes untuk debugging
  useEffect(() => {
    console.log('🚗 SidebarComponent: Vehicles updated:', {
      count: vehicles.length,
      vehicles: vehicles.map(v => ({ 
        id: v.vehicle_id, 
        name: v.name, 
        gps_id: v.gps_id,
        has_position: !!v.position 
      }))
    });
  }, [vehicles]);

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
    // If clicking the same panel, close it. Otherwise, open the new panel
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      
      // Load notifications data when opening notifications panel
      if (panel === 'notifications') {
        fetchNotifications();
      }
    }
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
        setSuccessAction('vehicle');
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
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Kendaraan</h3>

            {/* Vehicle Count */}
            <div className="mb-3 text-sm text-gray-600">
              {vehicles.length} kendaraan terdaftar
            </div>

            {/* Daftar kendaraan - Without internal scroll */}
            <div className="space-y-3 mb-4">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => {
                  const latestVehicleData = getVehicleDataByGpsId(vehicle.gps_id);
                  
                  return (
                    <div
                      key={vehicle.vehicle_id}
                      className={`p-3 rounded-lg cursor-pointer relative transition-all duration-200 ${
                        selectedVehicleId === vehicle.vehicle_id 
                          ? "bg-blue-50 border-2 border-blue-200" 
                          : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                      }`}
                      onClick={() => handleSelectVehicle(vehicle)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-grow pr-8">
                          <p className="font-bold mb-1 text-sm text-black">{vehicle.name || 'Tidak ada nama'}</p>
                          <p className="text-xs text-gray-600 mb-1">{vehicle.license_plate}</p>
                          <p className="text-xs text-gray-600 mb-1">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                          
                          {vehicle.sim_card_number && (
                            <p className="text-xs text-gray-600 mb-1">SIM: {vehicle.sim_card_number}</p>
                          )}   
                          
                          {vehicle.relay_status && (
                            <p className="text-xs text-gray-600 mb-1">
                              Mesin: {
                                vehicle.relay_status === 'ON'
                                ? <span className="text-green-600 font-semibold">ON</span>
                                : <span className="text-red-600 font-semibold">OFF</span>
                              }
                            </p>
                          )}
                          
                          {/* Data kendaraan real-time - Kompakt */}
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="text-blue-600 font-semibold">{latestVehicleData?.speed || 0} km/h</span>
                            <span className="mx-2">•</span>
                            <span className={`font-semibold ${latestVehicleData?.speed > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                              {latestVehicleData?.speed > 0 ? 'BERGERAK' : 'PARKIR'}
                            </span>
                          </div>
                          
                          {/* Button controls - Lebih kompakt */}
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
                              {loadingVehicles[vehicle.vehicle_id] ? '...' : 'OFF'}
                            </button>
                          </div>
                        </div>
                        
                        {/* Button hapus kendaraan */}
                        <button 
                          onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors duration-200 absolute top-2 right-2"
                          title={`Hapus kendaraan ${vehicle.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Tidak ada kendaraan</p>
                  <p className="text-gray-400 text-xs mt-1">Klik tombol di bawah untuk menambah</p>
                </div>
              )}
            </div>

            {/* Tombol aksi - Fixed di bawah */}
            <div className="space-y-2 border-t border-gray-200 pt-3 mt-auto">
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
          </>
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

      case 'profile':
        return (
          <div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4">
                {getInitials(currentUser?.fullName)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{currentUser?.fullName || 'User'}</h3>
              <p className="text-sm text-gray-500 mb-6">{currentUser?.email || 'user@example.com'}</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Informasi Akun</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Nama Lengkap</p>
                    <p className="text-sm">{currentUser?.fullName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm">{currentUser?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Username</p>
                    <p className="text-sm">{currentUser?.username || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">No. Telepon</p>
                    <p className="text-sm">{currentUser?.phoneNumber || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifikasi</h3>
            
            {/* Statistics Cards */}
            <div className="space-y-2 mb-4">
              {/* Total */}
              <div 
                onClick={() => setNotificationFilter('all')}
                className={`rounded-lg p-3 cursor-pointer transition-all ${
                  notificationFilter === 'all' 
                    ? 'bg-blue-50 border-2 border-blue-500' 
                    : 'bg-gray-50 border border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{notificationStats.total}</p>
                    <p className="text-xs text-gray-600">Total Pelanggaran</p>
                  </div>
                  <span className="text-lg">📊</span>
                </div>
              </div>

              {/* Area Violations */}
              <div 
                onClick={() => setNotificationFilter('area_terlarang')}
                className={`rounded-lg p-3 cursor-pointer transition-all ${
                  notificationFilter === 'area_terlarang' 
                    ? 'bg-orange-50 border-2 border-orange-500' 
                    : 'bg-gray-50 border border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-orange-600">{notificationStats.areaViolations}</p>
                    <p className="text-xs text-gray-600">Area Terlarang</p>
                  </div>
                  <span className="text-lg">🚫</span>
                </div>
              </div>

              {/* Exit Violations */}
              <div 
                onClick={() => setNotificationFilter('keluar_area_wajib')}
                className={`rounded-lg p-3 cursor-pointer transition-all ${
                  notificationFilter === 'keluar_area_wajib' 
                    ? 'bg-red-50 border-2 border-red-500' 
                    : 'bg-gray-50 border border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-red-600">{notificationStats.exitViolations}</p>
                    <p className="text-xs text-gray-600">Keluar Area Wajib</p>
                  </div>
                  <span className="text-lg">⛔</span>
                </div>
              </div>
            </div>

            {/* Delete All Button */}
            {notifications.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={isDeletingAll}
                className="w-full mb-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeletingAll ? 'Menghapus...' : 'Hapus Semua Notifikasi'}
              </button>
            )}

            {/* Notifications List - Without internal scroll */}
            <div className="space-y-2">
              {notificationsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading notifikasi...</p>
                </div>
              ) : getFilteredNotifications().length > 0 ? (
                getFilteredNotifications().map((alert) => (
                  <div key={alert.alert_id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        alert.alert_type === 'violation_enter' 
                          ? 'bg-orange-100' 
                          : 'bg-red-100'
                      }`}>
                        <span className="text-sm">
                          {alert.alert_type === 'violation_enter' ? '🚫' : '⛔'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 mb-1">
                          {alert.alert_type === 'violation_enter' 
                            ? 'MASUK AREA TERLARANG' 
                            : 'KELUAR AREA WAJIB'}
                        </p>
                        
                        <p className="text-xs text-gray-700 mb-1 break-words">
                          {alert.alert_message}
                        </p>
                        
                        <div className="text-xs text-gray-500">
                          <span>🕐 {new Date(alert.timestamp).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          {alert.lokasi && (
                            <div className="mt-1">📍 {alert.lokasi}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg">📭</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Tidak ada notifikasi
                  </p>
                  <p className="text-xs text-gray-600">
                    {notificationFilter === 'all' 
                      ? 'Belum ada notifikasi pelanggaran.'
                      : 'Tidak ada notifikasi untuk filter ini.'}
                  </p>
                </div>
              )}
              
              {/* Show count indicator if there are many notifications */}
              {getFilteredNotifications().length > 20 && (
                <div className="text-center pt-2 pb-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Total: {getFilteredNotifications().length} notifikasi
                  </p>
                </div>
              )}
            </div>
          </>
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
                <Image 
                  src="/icon/logo_web.png" 
                  alt="VehiTrack Logo" 
                  width={32} 
                  height={32}
                  style={{ width: 'auto', height: '32px' }}
                />
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
                  <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
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

            {/* Bottom Navigation Icons */}
            <div className="p-2 border-t border-gray-200">
              <div className="space-y-2">
                {/* Profile */}
                <button 
                  onClick={() => togglePanel('profile')}
                  className={`w-full p-3 rounded-lg transition-colors relative group ${
                    activePanel === 'profile' ? 'text-white bg-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-medium ${
                    activePanel === 'profile' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {getInitials(currentUser?.fullName)}
                  </div>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Profile
                    </div>
                  )}
                </button>

                {/* Notifications */}
                <button 
                  onClick={() => togglePanel('notifications')}
                  className={`w-full p-3 rounded-lg transition-colors relative group ${
                    activePanel === 'notifications' ? 'text-white bg-blue-600' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Notifikasi
                    </div>
                  )}
                </button>

                {/* Logout */}
                <button 
                  onClick={handleLogout}
                  className="w-full p-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors relative group"
                >
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!activePanel && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Logout
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          {activePanel && (
            <div className="w-64 border-l border-gray-200 bg-white flex flex-col h-full">
              <div className="p-4">
                {/* Header Section - Added to panel */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h1 className="text-lg font-semibold text-gray-900">VehiTrack Dashboard</h1>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(currentUser?.fullName)}
                      </div>
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-900">{currentUser?.fullName || 'User'}</p>
                        <p className="text-xs text-gray-500">{currentUser?.email || 'user@example.com'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Content - Scrollable area */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {renderPanelContent()}
              </div>
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

      {/* Rest of the modals and components remain the same... */}
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
            <h3 className="text-base font-bold mb-2 text-green-600 text-center">
              {successAction === 'notification' ? 'Berhasil Menghapus Notifikasi!' : 'Berhasil Menghapus Kendaraan!'}
            </h3>
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

      {/* Modal konfirmasi logout */}
      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-blue-500 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold mb-3 text-gray-800">Konfirmasi Logout</h3>
              
              <p className="text-gray-600 mb-6 text-sm">
                Apakah Anda yakin ingin keluar dari VehiTrack Dashboard?
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={cancelLogout}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-medium"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmLogout}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
                >
                  Ya, Logout
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

      {/* Modal konfirmasi hapus semua notifikasi */}
      {showDeleteAllConfirm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded-lg shadow-2xl max-w-xs w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 text-red-500 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-base font-bold mb-2 text-gray-800">Hapus Semua Notifikasi?</h3>
              
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  Apakah Anda yakin ingin menghapus semua notifikasi?
                </p>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="font-semibold text-sm text-gray-800">Total: {notifications.length} notifikasi</p>
                  <p className="text-xs text-gray-600">Area Terlarang: {notificationStats.areaViolations}</p>
                  <p className="text-xs text-gray-600">Keluar Area: {notificationStats.exitViolations}</p>
                </div>
                <p className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
              
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={isDeletingAll}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 text-sm font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDeleteAllNotifications}
                  disabled={isDeletingAll}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm font-medium disabled:opacity-50"
                >
                  {isDeletingAll ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>,
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

export default SidebarComponent; 'ON'}
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
                              {loadingVehicles[vehicle.vehicle_id] ? '...' :