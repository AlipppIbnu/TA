// pages/Dashboard.js - Simplified version using SWR in MapComponent
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; 
import ModalSetGeofence from "@/components/ModalSetGeofence";
import GeofenceNotification from "@/components/GeofenceNotification";
import useGeofenceNotifications from "@/components/hooks/useGeofenceNotifications";
import { getCurrentUser, isAuthenticated } from "@/lib/authService";
import { getUserVehicles } from "@/lib/vehicleService";
import directusConfig from "@/lib/directusConfig";
import { deleteVehicle } from "@/lib/vehicleService";
import { getGeofenceStatus } from "@/utils/geofenceUtils";

// Import dinamis untuk MapComponent (tanpa SSR)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  
  // Refs
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);
  const lastGeofenceStatusRef = useRef({});

  // Geofence notifications hook
  const {
    notifications: geofenceNotifications,
    addNotification: addGeofenceNotification,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications
  } = useGeofenceNotifications(5, 8000); // Max 5 notifications, auto-remove after 8 seconds

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

  // Load user data dan kendaraan
  useEffect(() => {
    const loadUserAndVehicles = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          router.push("/auth/login");
          return;
        }

        // Get current user data
        const userData = getCurrentUser();
        if (!userData) {
          router.push("/auth/login");
          return;
        }

        setUser(userData);

        // Load vehicles for current user - this will get fresh data including positions
        const userVehicles = await getUserVehicles();
        
        setVehicles(userVehicles);
        if (userVehicles.length > 0) {
          setSelectedVehicle(userVehicles[0]);
        }

        // Load geofences
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

  // Load geofences from API
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
      // Don't show error alert for geofences as it's not critical for dashboard functionality
    }
  };

  // Monitor geofence status changes for notifications
  useEffect(() => {
    if (!vehicles.length || !geofences.length) {
      return;
    }
    
    // Function to check geofence status
    const checkGeofenceStatus = () => {
    vehicles.forEach(vehicle => {
        if (!vehicle.position) {
          return;
        }
      
        try {
      const currentVehicleId = vehicle.vehicle_id;
          const geofenceStatus = getGeofenceStatus(vehicle, getVisibleGeofences());
          
          // Generate key unik untuk kendaraan ini
          const statusKey = `${currentVehicleId}`;
      
      // Bandingkan dengan status sebelumnya
      const prevStatus = lastGeofenceStatusRef.current[statusKey];
          
          // Determine current status
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
            return;
          }
      
      // Jika status berubah, buat notifikasi
          if (prevStatus !== currentInside) {
            const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || vehicle.name || 'Unknown'})`.trim();
            
            const notificationData = {
              event_id: Date.now(),
              vehicle_id: currentVehicleId,
              vehicle_name: vehicleName,
              geofence_id: geofenceStatus?.id || 'unknown',
              geofence_name: geofenceStatus?.name || 'area yang ditentukan',
              event_type: currentInside ? 'enter' : 'exit',
              timestamp: new Date().toISOString()
            };
            
            addGeofenceNotification(notificationData);
      }
      
      // Update status untuk pengecekan berikutnya
          lastGeofenceStatusRef.current[statusKey] = currentInside;
        } catch (error) {
          console.error(`Error checking geofence status for vehicle ${vehicle.vehicle_id}:`, error);
        }
      });
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

  // Fungsi untuk menampilkan error alert
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
    
    setTimeout(() => {
      setShowErrorAlert(false);
      setErrorMessage('');
    }, 5000);
  };

  // Fungsi untuk menutup error alert
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
        showErrorMessage(`Tidak ada data history untuk kendaraan ${existingVehicle.name} dengan GPS ID ${existingVehicle.gps_id}`);
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
  const handleGeofenceSukses = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setIsMultiPolygon(false);
    
    // Reload geofences
    loadGeofences().then(() => {
      // Auto-enable geofence visibility untuk semua kendaraan yang memiliki geofence
      setTimeout(() => {
        const newVisibility = { ...vehicleGeofenceVisibility };
        
        vehicles.forEach(vehicle => {
          // Enable geofence visibility untuk kendaraan ini
          newVisibility[vehicle.vehicle_id] = true;
        });
        
        setVehicleGeofenceVisibility(newVisibility);
      }, 1000);
    });
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

  // Filter geofences berdasarkan visibility
  const getVisibleGeofences = () => {
    const filtered = geofences.filter(geofence => {
      // Prioritas vehicle_id field langsung
      let vehicleId = geofence.vehicle_id;
      
      // Fallback ke extraction dari type jika vehicle_id kosong
      if (!vehicleId) {
        const typeMatch = geofence.type.match(/^(\w+)_vehicle_(\w+)$/);
        if (typeMatch) {
          vehicleId = typeMatch[2];
        }
      }
      
      // Jika tidak ada vehicle_id, skip geofence ini
      if (!vehicleId) {
        return false;
      }
      
      // Convert ke string untuk matching
      const vehicleIdStr = String(vehicleId);
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
    <div className="h-screen bg-gray-100 flex relative">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-grow relative">
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          isDrawingMode={isDrawingMode}
          isMultiPolygon={isMultiPolygon}
          onPolygonComplete={handlePolygonComplete}
          onSetFinishMultiPolygonCallback={setFinishMultiPolygonCallback}
          geofences={getVisibleGeofences()}
        />
      </div>

      {/* Geofence Notifications */}
      <GeofenceNotification
        notifications={geofenceNotifications}
        onDismiss={removeGeofenceNotification}
        onDismissAll={removeAllGeofenceNotifications}
      />

      {/* Modal Tambah Kendaraan */}
      {showTambahModal && (
        <ModalTambahKendaraan
          onClose={() => setShowTambahModal(false)}
          onSucceed={handleTambahSukses}
        />
      )}

      {/* Modal Set Geofence */}
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

      {/* Error Alert */}
      {showErrorAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-600">Error!</h3>
            <p>{errorMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleCloseErrorAlert}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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