// pages/Dashboard.js - Versi yang disederhanakan menggunakan SWR di MapComponent
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; 
import ModalSetGeofence from "@/components/ModalSetGeofence";
import useGeofenceNotifications from "@/components/hooks/useGeofenceNotifications";
import { getCurrentUser, isAuthenticated } from "@/lib/authService";
import { getUserVehicles } from "@/lib/vehicleService";
import directusConfig from "@/lib/directusConfig";
import { deleteVehicle } from "@/lib/vehicleService";
import { getGeofenceStatus } from "@/utils/geofenceUtils";
import { toast, ToastContainer } from 'react-toastify';
import { handleGeofenceViolation } from '@/utils/geofenceApi';
import GeofenceNotification from '@/components/GeofenceNotification';

// Import dinamis untuk MapComponent (tanpa SSR)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  
  // Refs
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);
  const lastGeofenceStatusRef = useRef({});

  // Hook notifikasi geofence
  const {
    notifications: geofenceNotifications,
    addNotification: addGeofenceNotification,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications
  } = useGeofenceNotifications(5, 8000); // Maksimal 5 notifikasi, otomatis hapus setelah 8 detik

  // State untuk user dan loading
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk kendaraan
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistories, setVehicleHistories] = useState([]);
  
  // State untuk modal dan notifikasi
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State untuk geofence
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isMultiPolygon, setIsMultiPolygon] = useState(false);
  const [geofences, setGeofences] = useState([]);
  const [vehicleGeofenceVisibility, setVehicleGeofenceVisibility] = useState({});
  const [finishMultiPolygonCallback, setFinishMultiPolygonCallback] = useState(null);

  // State untuk UI
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load user data dan kendaraan
  useEffect(() => {
    const loadUserAndVehicles = async () => {
      try {
        // Periksa apakah pengguna sudah terotentikasi
        if (!isAuthenticated()) {
          router.push("/auth/login");
          return;
        }

        // Dapatkan data pengguna saat ini
        const userData = getCurrentUser();
        if (!userData) {
          router.push("/auth/login");
          return;
        }

        setUser(userData);

        // Muat kendaraan untuk pengguna saat ini - ini akan mendapatkan data segar termasuk posisi
        const userVehicles = await getUserVehicles();
        
        setVehicles(userVehicles);
        if (userVehicles.length > 0) {
          setSelectedVehicle(userVehicles[0]);
        }

        // Muat geofences
        await loadGeofences();
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMessage('Gagal memuat data kendaraan');
        setShowErrorAlert(true);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndVehicles();
  }, [router]);

  // Muat geofences dari API
  const loadGeofences = async () => {
    try {
      const response = await fetch('/api/geofences');
      
      if (!response.ok) {
        throw new Error('Failed to fetch geofences');
      }

      const data = await response.json();
      
      if (data.success) {
        const geofencesData = data.data || [];
        setGeofences(geofencesData);
      } else {
        throw new Error(data.message || 'Failed to load geofences');
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
      setGeofences([]);
      // Jangan tampilkan alert error untuk geofences karena tidak kritis untuk fungsi dashboard
    }
  };

  // Monitor perubahan status geofence untuk notifikasi
  useEffect(() => {
    if (!vehicles.length || !geofences.length) {
      return;
    }
    
    // Fungsi untuk memeriksa status geofence
    const checkGeofenceStatus = async () => {
      for (const vehicle of vehicles) {
        if (!vehicle.position) {
          continue;
        }
      
        try {
      const currentVehicleId = vehicle.vehicle_id;
          
          // Hanya cek geofence yang terkait dengan kendaraan ini
          let geofenceStatus = null;
          if (vehicle.geofence_id) {
            // Cari geofence yang terkait dengan kendaraan ini
            const vehicleGeofence = geofences.find(g => g.geofence_id === vehicle.geofence_id);
            if (vehicleGeofence) {
              // Hanya cek status untuk geofence yang terkait dengan kendaraan ini
              geofenceStatus = getGeofenceStatus(vehicle, [vehicleGeofence]);
            }
          }
          // Jika vehicle tidak memiliki geofence_id, skip monitoring
          if (!geofenceStatus) {
            continue;
          }
          
          // Generate key unik untuk kendaraan ini
          const statusKey = `${currentVehicleId}`;
      
      // Bandingkan dengan status sebelumnya
      const prevStatus = lastGeofenceStatusRef.current[statusKey];
      
          // Tentukan status saat ini
          const currentInside = geofenceStatus && geofenceStatus.inside;
          
          // Jika ini adalah pengecekan pertama, set status dan trigger notifikasi jika di luar
          if (prevStatus === undefined) {
            lastGeofenceStatusRef.current[statusKey] = currentInside;
            
            // Jika kendaraan berada di luar geofence saat pertama kali dimonitor, buat notifikasi
            if (!currentInside && geofenceStatus) {
              const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || vehicle.name || 'Unknown'})`.trim();
              
              const notificationData = {
                event_id: Date.now(),
                vehicle_id: currentVehicleId,
                vehicle_name: vehicleName,
                geofence_id: geofenceStatus?.id || 'unknown',
                geofence_name: geofenceStatus?.name || 'area yang ditentukan',
                event_type: 'exit',
                timestamp: new Date().toISOString()
              };
              
              addGeofenceNotification(notificationData);
            }
            continue;
          }
      
          // Jika status berubah, buat notifikasi DAN simpan ke Directus
          if (prevStatus !== currentInside) {
            const timestamp = new Date().toISOString();
            const eventType = currentInside ? 'enter' : 'exit';
            const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || vehicle.name || 'Unknown'})`.trim();
            
            // Prepare vehicle data for API
            const vehicleData = {
              vehicle_id: currentVehicleId,
              vehicle_name: vehicleName,
              name: vehicle.name,
              make: vehicle.make,
              model: vehicle.model,
              license_plate: vehicle.license_plate,
              position: vehicle.position
            };

            // Prepare geofence data for API
            const geofenceData = {
              geofence_id: geofenceStatus?.id || 'unknown',
              geofence_name: geofenceStatus?.name || 'area yang ditentukan',
              name: geofenceStatus?.name || 'area yang ditentukan',
              rule_type: geofenceStatus?.type || 'STAY_IN'
            };

            // 1. Tampilkan notifikasi lokal terlebih dahulu (untuk response cepat)
            const notificationData = {
              event_id: Date.now(),
              vehicle_id: currentVehicleId,
              vehicle_name: vehicleName,
              geofence_id: geofenceStatus?.id || 'unknown',
              geofence_name: geofenceStatus?.name || 'area yang ditentukan',
              event_type: eventType,
              timestamp: timestamp
            };
            
            addGeofenceNotification(notificationData);

            // 2. Simpan ke Directus (geofence_events dan alerts)
            try {
              const result = await handleGeofenceViolation({
                eventType: eventType,
                vehicle: vehicleData,
                geofence: geofenceData,
                timestamp: timestamp
              });

              if (!result.success) {
                console.error('Failed to save to Directus:', result.error);
              }
            } catch (error) {
              console.error('Error in handleGeofenceViolation:', error);
            }
      }
      
      // Update status untuk pengecekan berikutnya
          lastGeofenceStatusRef.current[statusKey] = currentInside;
        } catch (error) {
          console.error(`Error checking geofence status for vehicle ${vehicle.vehicle_id}:`, error);
        }
      }
    };

    // Initial check
    checkGeofenceStatus();

    // Set up interval for real-time monitoring (every 10 seconds)
    const monitoringInterval = setInterval(checkGeofenceStatus, 10000);

    // Cleanup interval on unmount or dependency change
    return () => {
      clearInterval(monitoringInterval);
    };
  }, [vehicles, geofences, addGeofenceNotification, vehicleGeofenceVisibility]);

  // Monitor untuk reload vehicle positions secara berkala
  useEffect(() => {
    const reloadVehiclePositions = async () => {
      try {
        const userVehicles = await getUserVehicles();
        setVehicles(userVehicles);
        
        // Update selected vehicle if it exists in new data
        if (selectedVehicle) {
          const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
          if (updatedSelectedVehicle) {
            setSelectedVehicle(prev => ({
              ...updatedSelectedVehicle,
              path: prev.path // Keep existing path if any
            }));
          }
        }
      } catch (error) {
        console.error('Error reloading vehicle positions:', error);
      }
    };

    // Reload positions every 60 seconds for fresh data
    const positionInterval = setInterval(reloadVehiclePositions, 60000);

    return () => {
      clearInterval(positionInterval);
    };
  }, [selectedVehicle]);

  // Monitor geofence notifications untuk production
  useEffect(() => {
    // if (geofenceNotifications.length > 0) {
    //   console.log(`📱 Active geofence notifications: ${geofenceNotifications.length}`);
    // }
  }, [geofenceNotifications]);

  // Error handling functions
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage('');
  };

  // Fungsi untuk handle klik riwayat kendaraan
  const handleHistoryClick = async (vehicleId) => {
    if (!vehicleId) return;
  
    try {
      // Pastikan kendaraan masih ada dalam daftar
      const existingVehicle = vehicles.find(v => v.vehicle_id === vehicleId);
      if (!existingVehicle) {
        showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
        return;
      }

      // Check if gps_id exists
      if (!existingVehicle.gps_id) {
        showErrorMessage(`Kendaraan ${existingVehicle.name} belum memiliki GPS ID. Tidak bisa menampilkan history.`);
        return;
      }

      // Option 1: Use dedicated history API (cleaner)
      const historyUrl = `/api/history?gps_id=${encodeURIComponent(existingVehicle.gps_id)}`;

      const response = await fetch(historyUrl);

      if (!response.ok) {
        console.error(`HTTP Error ${response.status}: ${response.statusText}`);
        throw new Error("Gagal mengambil data riwayat");
      }
      
      const data = await response.json();
  
      if (!data.success || !data.data || data.data.length === 0) {
        showErrorMessage(`Tidak ada data history untuk kendaraan ${existingVehicle.name}\n(${existingVehicle.license_plate})`);
        return;
      }

      // Data sudah difilter di API, tinggal transform ke format yang dibutuhkan map
      const pathCoords = data.data.map(coord => ({
          lat: parseFloat(coord.latitude),
          lng: parseFloat(coord.longitude),
        timestamp: coord.timestamp
        }));

      // Gunakan existingVehicle yang sudah diverifikasi
      setSelectedVehicle({
        ...existingVehicle,
        path: pathCoords
      });
  
    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
      showErrorMessage("Gagal memuat riwayat kendaraan: " + err.message);
    }
  };

  // Fungsi untuk handle vehicle selection dari sidebar
  const handleSelectVehicle = (vehicle) => {
    // Handle null vehicle (when deselecting)
    if (!vehicle) {
      setSelectedVehicle(null);
      return;
    }
    
    // Pastikan kendaraan masih ada dalam daftar sebelum memilihnya
    const existingVehicle = vehicles.find(v => v.vehicle_id === vehicle.vehicle_id);
    if (!existingVehicle) {
      showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
      return;
    }
    setSelectedVehicle(existingVehicle);
  };

  // Fungsi untuk hide history
  const handleHideHistory = () => {
    if (selectedVehicle) {
      // Remove path to hide history lines
      setSelectedVehicle({
        ...selectedVehicle,
        path: undefined
      });
    }
  };

  // Fungsi untuk menampilkan modal tambah kendaraan
  const handleTambahKendaraan = () => {
    setShowTambahModal(true);
  };

  // Fungsi untuk ketika kendaraan berhasil ditambah
  const handleTambahSukses = (newVehicle) => {
    // Add the new vehicle to the vehicles state
    setVehicles(prevVehicles => [...prevVehicles, {
      ...newVehicle,
      position: null // Set initial position as null
    }]);
    
    // Close the modal
    setShowTambahModal(false);
  };

  // Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    // Cek apakah ada kendaraan tersedia
    if (vehicles.length === 0) {
      setErrorMessage('Tidak ada kendaraan tersedia! Tambahkan kendaraan terlebih dahulu.');
      setShowErrorAlert(true);
      return;
    }
    
    setShowGeofenceModal(true);
  };

  // Handler untuk drawing mode
  const handleStartDrawing = (start = true, isMultiPolygon = false) => {
    setIsDrawingMode(start);
    setIsMultiPolygon(isMultiPolygon);
  };

  // Handler untuk finish multipolygon
  const handleFinishMultiPolygon = () => {
    if (finishMultiPolygonCallback) {
      finishMultiPolygonCallback();
    } else {
      console.error("Dashboard: finishMultiPolygonCallback is null");
    }
  };

  // Handler untuk polygon completion
  const handlePolygonComplete = (coordinates) => {
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handlePolygonComplete(coordinates);
    }
  };

  // Handler untuk ketika geofence berhasil dibuat
  const handleGeofenceSukses = async () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setIsMultiPolygon(false);
    
    try {
      // Reload both geofences AND vehicles (karena vehicle.geofence_id berubah)
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          setVehicles(userVehicles);
          // Update selected vehicle if it exists in new data
          if (selectedVehicle) {
            const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
            if (updatedSelectedVehicle) {
              setSelectedVehicle(updatedSelectedVehicle);
            }
          }
        })
      ]);
    } catch (error) {
      console.error("Error refreshing data after geofence creation:", error);
    }
  };

  // Handler untuk ketika geofence berhasil dihapus
  const handleGeofenceDeleted = async (deletedGeofenceId) => {
    try {
      // Reload both geofences AND vehicles (karena vehicle.geofence_id mungkin berubah)
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          setVehicles(userVehicles);
          // Update selected vehicle if it exists in new data
          if (selectedVehicle) {
            const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
            if (updatedSelectedVehicle) {
              setSelectedVehicle(updatedSelectedVehicle);
            }
          }
        })
      ]);
    } catch (error) {
      console.error("Error refreshing data after geofence deletion:", error);
    }
  };

  // Handler untuk menutup modal geofence
  const handleCloseGeofenceModal = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
  };

  // Handler untuk toggle geofence visibility
  const handleToggleGeofence = (vehicleId, isVisible) => {
    setVehicleGeofenceVisibility(prev => ({
      ...prev,
      [vehicleId]: isVisible
    }));
  };

  // Filter geofences berdasarkan visibility (Vehicle-Centric Approach)
  const getVisibleGeofences = () => {
    const filtered = geofences.filter(geofence => {
      // Cari vehicle yang menggunakan geofence ini
      const vehicleUsingThisGeofence = vehicles.find(vehicle => 
        vehicle.geofence_id === geofence.geofence_id
      );
      
      // Jika tidak ada vehicle yang menggunakan geofence ini, skip
      if (!vehicleUsingThisGeofence) {
        return false;
      }
      
      // Cek apakah visibility untuk vehicle tersebut aktif
      const vehicleIdStr = String(vehicleUsingThisGeofence.vehicle_id);
      const isVisible = vehicleGeofenceVisibility[vehicleIdStr] === true;
      
      return isVisible;
    });
    
    return filtered;
  };

  // Fungsi untuk menghapus kendaraan
  const handleDeleteVehicle = async (vehicleId) => {
    try {
      // console.log(`Menghapus kendaraan dengan ID: ${vehicleId}`); // Removed debugging log
      
      const response = await fetch(`/api/HapusKendaraan?id=${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menghapus kendaraan');
      }
      
      // Update local state after successful deletion
      const updatedVehicles = vehicles.filter(vehicle => vehicle.vehicle_id !== vehicleId);
      setVehicles(updatedVehicles);
      
      // Update selected vehicle if needed
      if (selectedVehicle && selectedVehicle.vehicle_id === vehicleId) {
        setSelectedVehicle(updatedVehicles.length > 0 ? updatedVehicles[0] : null);
      }
      
      return true; // Return true to indicate successful deletion
      
    } catch (error) {
      console.error('Error menghapus kendaraan:', error);
      throw error; // Re-throw error to be handled by the caller
    }
  };

  // Tampilkan loading screen
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 w-80 h-full bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
      <SidebarComponent 
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        onHistoryClick={handleHistoryClick}
        onTambahKendaraan={handleTambahKendaraan}
        onDeleteVehicle={handleDeleteVehicle}
        onSetGeofence={handleSetGeofence}
        selectedVehicle={selectedVehicle}
        geofences={geofences}
        onToggleGeofence={handleToggleGeofence}
          onHideHistory={handleHideHistory}
      />
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ease-in-out lg:ml-80`}
      >
        {/* Map Container */}
        <div className="relative h-screen">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-4 right-16 z-[1001] p-2 bg-white rounded-md shadow-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Map */}
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          isDrawingMode={isDrawingMode}
          isMultiPolygon={isMultiPolygon}
          onPolygonComplete={handlePolygonComplete}
            geofences={getVisibleGeofences()}
            allGeofences={geofences}
            onGeofenceDeleted={handleGeofenceDeleted}
          />

          {/* Geofence Notifications - positioned on the right */}
          <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-[420px] w-full">
            {geofenceNotifications.map((notification) => (
              <GeofenceNotification
                key={notification.id}
                notification={notification}
                onRemove={removeGeofenceNotification}
              />
            ))}
            
            {/* Dismiss All Button - only show if there are multiple notifications */}
            {geofenceNotifications.length > 1 && (
              <div className="flex justify-end">
              <button 
                  onClick={removeAllGeofenceNotifications}
                  className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm font-medium"
              >
                  Tutup Semua ({geofenceNotifications.length})
              </button>
            </div>
            )}
          </div>

          {/* Geofence Modal */}
          {showGeofenceModal && (
            <ModalSetGeofence
              ref={geofenceModalRef}
              onClose={handleCloseGeofenceModal}
              onSucceed={handleGeofenceSukses}
              onStartDrawing={handleStartDrawing}
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onFinishMultiPolygon={handleFinishMultiPolygon}
            />
          )}
        </div>

      {/* Modal Tambah Kendaraan */}
      {showTambahModal && (
        <ModalTambahKendaraan
          onClose={() => setShowTambahModal(false)}
          onSucceed={handleTambahSukses}
        />
      )}

      {/* Error Alert */}
      {showErrorAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-red-500 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold mb-4 text-red-600">Tidak Ada Data History</h3>
                
                <div className="mb-6">
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {errorMessage}
                  </div>
                </div>
                
                <div className="flex justify-center">
              <button 
                onClick={handleCloseErrorAlert}
                    className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium"
              >
                OK
              </button>
                </div>
            </div>
          </div>
        </div>
      )}

        {/* Toast Container */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="toast-container"
          toastClassName="toast-item"
        />
      </main>
    </div>
  );
}

// Ambil data kendaraan + posisi terakhir
export async function getServerSideProps() {
  try {
    // console.log("=== getServerSideProps STARTING ==="); // Removed debugging log
    
    // Tambahkan timeout untuk request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Fetch vehicles and their latest coordinates using directusConfig
    const [resVehicles, resVehicleData] = await Promise.all([
      fetch(`${directusConfig.baseURL}/items/vehicle`, {
        signal: controller.signal,
        headers: directusConfig.headers
      }),
      fetch(`${directusConfig.baseURL}/items/vehicle_datas?sort=-timestamp&limit=1000`, {
        signal: controller.signal,
        headers: directusConfig.headers
      })
    ]);
    
    clearTimeout(timeoutId);

    if (!resVehicles.ok || !resVehicleData.ok) {
      console.error("Fetch failed:", { 
        vehiclesStatus: resVehicles.status, 
        vehicleDataStatus: resVehicleData.status 
      });
      throw new Error("Gagal fetch dari Directus.");
    }

    const vehiclesData = await resVehicles.json();
    const vehicleDataResponse = await resVehicleData.json();

    // console.log("Vehicles from DB:", vehiclesData.data?.length || 0, "vehicles"); // Removed debugging log
    // console.log("Vehicle data from DB:", vehicleDataResponse.data?.length || 0, "data points"); // Removed debugging log

    // Group vehicle_datas by gps_id and get latest position
    const latestPositions = {};
    vehicleDataResponse.data.forEach(data => {
      if (!data.gps_id) {
        console.warn("Vehicle data without gps_id:", data);
        return;
      }
      
      if (!latestPositions[data.gps_id] || new Date(data.timestamp) > new Date(latestPositions[data.gps_id].timestamp)) {
        latestPositions[data.gps_id] = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          timestamp: data.timestamp
        };
      }
    });

    // console.log("Latest positions by gps_id:", Object.keys(latestPositions).length, "positions"); // Removed debugging log

    // Combine vehicle data with their latest positions using gps_id
    const vehicles = vehiclesData.data.map(vehicle => {
      const position = latestPositions[vehicle.gps_id] || null;
      
      // if (position) {
      //   console.log(`Vehicle ${vehicle.vehicle_id} (${vehicle.name}) has position:`, position); // Removed debugging log
      // } else {
      //   console.log(`Vehicle ${vehicle.vehicle_id} (${vehicle.name}) has NO position for gps_id:`, vehicle.gps_id); // Removed debugging log
      // }
      
      return {
      ...vehicle,
        position
      };
    });

    // console.log("Final vehicles with positions:", vehicles.map(v => ({ // Removed debugging log
    //   vehicle_id: v.vehicle_id,
    //   name: v.name,
    //   gps_id: v.gps_id,
    //   hasPosition: !!v.position
    // })));
    
    // console.log("=== getServerSideProps COMPLETE ==="); // Removed debugging log

    return { props: { vehicles } };
  } catch (err) {
    console.error("❌ Gagal fetch data server:", err);
    
    // Saat mode pengembangan, dapatkan lebih banyak informasi error
    const errorMessage = err.message || String(err);
    const isTimeout = err.name === 'AbortError';
    
    console.error({
      error: errorMessage,
      isTimeout,
      stack: err.stack
    });
    
    return { 
      props: { 
        vehicles: [],
        error: {
          message: errorMessage,
          isTimeout 
        }
      } 
    };
  }
}