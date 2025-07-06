// pages/dashboard.js - Complete Fixed Version
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import SidebarComponent from "../components/SidebarComponent";
import ModalSetGeofence from "@/components/ModalSetGeofence";
import useGeofenceNotifications from "@/components/hooks/useGeofenceNotifications";
import { getCurrentUser, isAuthenticated } from "@/lib/authService";
import { getUserVehicles, addVehicle } from "@/lib/vehicleService";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { ToastContainer } from 'react-toastify';
import GeofenceNotification from '@/components/GeofenceNotification';

// Import dinamis untuk MapComponent (tanpa SSR)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

// =============================================================================
// LOCALSTORAGE HELPERS untuk Persist Real-time Positions
// =============================================================================
const REALTIME_POSITIONS_KEY = 'vehitrack_realtime_positions';
const POSITION_CACHE_DURATION = 10 * 60 * 1000; // 10 menit

const saveRealtimePositions = (vehicles) => {
  try {
    const positions = {};
    vehicles.forEach(vehicle => {
      if (vehicle.position && vehicle.position.isRealTimeUpdate) {
        positions[vehicle.gps_id] = {
          ...vehicle.position,
          savedAt: Date.now()
        };
      }
    });
    
    if (Object.keys(positions).length > 0) {
      localStorage.setItem(REALTIME_POSITIONS_KEY, JSON.stringify(positions));
      console.log('💾 Saved realtime positions to localStorage:', Object.keys(positions));
    }
  } catch (error) {
    console.warn('Failed to save positions to localStorage:', error);
  }
};

const loadRealtimePositions = () => {
  try {
    const saved = localStorage.getItem(REALTIME_POSITIONS_KEY);
    if (!saved) return {};
    
    const positions = JSON.parse(saved);
    const now = Date.now();
    
    // Filter out old positions
    const validPositions = {};
    Object.keys(positions).forEach(gpsId => {
      const position = positions[gpsId];
      if (position && (now - position.savedAt) < POSITION_CACHE_DURATION) {
        validPositions[gpsId] = position;
      }
    });
    
    console.log('📱 Loaded realtime positions from localStorage:', Object.keys(validPositions));
    return validPositions;
  } catch (error) {
    console.warn('Failed to load positions from localStorage:', error);
    return {};
  }
};

// Modal Tambah Kendaraan
function ModalTambahKendaraan({ onClose, onSucceed }) {
  const [formData, setFormData] = useState({
    license_plate: "",
    name: "",
    make: "",
    model: "",
    year: "",
    sim_card_number: "",
    gps_id: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isCheckingGps, setIsCheckingGps] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [licensePlateError, setLicensePlateError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'gps_id') {
      setGpsError('');
    }
    if (name === 'license_plate') {
      setLicensePlateError('');
    }
    setError('');
  };

  const checkLicensePlate = async (licensePlate) => {
    try {
      const response = await fetch(`/api/CheckVehicle?license_plate=${licensePlate}`);
      const data = await response.json();

      if (data.exists) {
        setLicensePlateError('Nomor plat sudah digunakan');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking License Plate:', err);
      setLicensePlateError('Gagal memeriksa nomor plat');
      return false;
    }
  };

  const checkGpsDeviceId = async (gpsId) => {
    try {
      setIsCheckingGps(true);
      const response = await fetch(`/api/CheckGpsDevice?gps_id=${gpsId}`);
      const data = await response.json();

      if (data.exists) {
        setGpsError('GPS Device ID sudah digunakan oleh kendaraan lain');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking GPS device ID:', err);
      setGpsError('Gagal memeriksa GPS Device ID');
      return false;
    } finally {
      setIsCheckingGps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
  
    try {
      if (!formData.license_plate || !formData.name || 
          !formData.make || !formData.model || !formData.year) {
        throw new Error("Mohon isi semua field yang wajib!");
      }

      const isLicensePlateAvailable = await checkLicensePlate(formData.license_plate);
      if (!isLicensePlateAvailable) {
        setLoading(false);
        return;
      }

      if (formData.gps_id) {
        const isGpsAvailable = await checkGpsDeviceId(formData.gps_id);
        if (!isGpsAvailable) {
          setLoading(false);
          return;
        }
      }

      const newVehicle = await addVehicle(formData);
      
      setSuccessMessage(`Kendaraan ${formData.make} ${formData.model} berhasil ditambahkan!`);
        
      setTimeout(() => {
        onSucceed(newVehicle);
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg w-[280px] overflow-hidden">
        <div className="px-4 py-3 border-b border-black">
          <h2 className="text-base font-semibold">Tambah Kendaraan Baru</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3 space-y-3">
            <div>
              <label className="block text-sm mb-1"> Nomor Plat </label>
              <input
                type="text"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${
                  licensePlateError ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {licensePlateError && (
                <p className="mt-1 text-xs text-red-600">{licensePlateError}</p>
              )}
            </div>
          
            <div>
              <label className="block text-sm mb-1"> Nama Kendaraan </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          
            <div>
              <label className="block text-sm mb-1"> Merek </label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          
            <div>
              <label className="block text-sm mb-1"> Model </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          
            <div>
              <label className="block text-sm mb-1"> Tahun </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1"> Nomor SIM Card </label>
              <input
                type="text"
                name="sim_card_number"
                value={formData.sim_card_number}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          
            <div>
              <label className="block text-sm mb-1"> GPS Device ID </label>
              <p className="text-xs text-gray-500 mb-1">Masukkan UUID yang ada pada alat GPS (opsional)</p>
              <input
                type="text"
                name="gps_id"
                value={formData.gps_id}
                onChange={handleChange}
                placeholder="Contoh: 123e4567-e89b-12d3-a456-426614174000"
                className={`w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${
                  gpsError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {gpsError && (
                <p className="mt-1 text-xs text-red-600">{gpsError}</p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                {successMessage}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              disabled={loading || isCheckingGps}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  
  // Refs
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);

  // State untuk user authentication
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Hook notifikasi geofence dengan real-time detection
  const {
    notifications: geofenceNotifications,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications,
    checkVehicleGeofenceViolations
  } = useGeofenceNotifications(10000);

  // Hook WebSocket untuk real-time GPS updates
  const { data: wsData, isConnected } = useWebSocket();

  // State untuk user dan loading
  const [loading, setLoading] = useState(true);
  
  // State untuk kendaraan - initialize tanpa position dari server
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // State untuk tracking WebSocket connection
  const [wsConnected, setWsConnected] = useState(false);
  
  // State untuk tracking apakah sudah menerima data WebSocket pertama kali
  const [hasReceivedWebSocketData, setHasReceivedWebSocketData] = useState(false);
  
  // State untuk menyimpan data terbaru dari WebSocket
  const [latestWebSocketPositions, setLatestWebSocketPositions] = useState({});
  
  // State untuk kontrol tampilan map - tunggu data WebSocket terbaru
  const [showMap, setShowMap] = useState(false);

  // State untuk modal dan notifikasi
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State untuk geofence
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingType, setDrawingType] = useState('polygon');
  const [geofences, setGeofences] = useState([]);
  const [vehicleGeofenceVisibility, setVehicleGeofenceVisibility] = useState({});

  // State untuk sidebar alignment (untuk basemap selector)
  const [sidebarState, setSidebarState] = useState({
    isSidebarVisible: true,
    activePanel: null,
    sidebarWidth: 0
  });

  // Helper function untuk mendapatkan user ID yang konsisten
  const getUserId = useCallback((userData) => {
    return userData?.userId || userData?.users_id || userData?.user_id || null;
  }, []);

  // Muat geofences dari API - wrapped in useCallback to fix dependency warning
  const loadGeofences = useCallback(async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = getUserId(user);
      
      const response = await fetch(`/api/geofences?user_id=${userId}`);
      
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
    }
  }, [user, getUserId]);

  // Enhanced authentication check
  useEffect(() => {
    const checkAuth = () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        console.log('❌ User not authenticated, redirecting to login');
        router.push("/login");
        return;
      }

      // Get user data from session
      const userData = getCurrentUser();
      if (!userData) {
        console.log('❌ No user data found, redirecting to login');
        router.push("/login");
        return;
      }

      // Validate user data structure
      const userId = getUserId(userData);
      if (!userId) {
        console.log('❌ Invalid user data structure, redirecting to login');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('user');
          localStorage.removeItem('user');
        }
        router.push("/login");
        return;
      }

      console.log('✅ User authenticated:', {
        userId: userId,
        email: userData.email,
        name: userData.name || userData.fullName || userData.full_name
      });

      setUser(userData);
      setAuthChecked(true);
    };

    checkAuth();
  }, [router, getUserId]);

  // Load vehicles only after auth is confirmed
  useEffect(() => {
    if (!authChecked || !user) return;

    const loadUserVehicles = async () => {
      try {
        setLoading(true);
        
        // Get userId with proper field mapping
        const userId = getUserId(user);
        
        if (!userId) {
          console.error('❌ No valid user ID found');
          router.push("/login");
          return;
        }

        // MULTI-USER: Ambil kendaraan user-specific dari API
        const userVehicles = await getUserVehicles();
        
        // Set vehicles tanpa position - tunggu WebSocket data terbaru
        const vehiclesWithoutPosition = userVehicles.map(vehicle => ({
          ...vehicle,
          position: null // Selalu null - tunggu WebSocket data terbaru
        }));
        
        setVehicles(vehiclesWithoutPosition);
        
        console.log('✅ User vehicles loaded without positions, waiting for latest WebSocket data...', vehiclesWithoutPosition.length);
        await loadGeofences();
        
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMessage('Gagal memuat data kendaraan');
        setShowErrorAlert(true);
      } finally {
        setLoading(false);
      }
    };

    loadUserVehicles();
  }, [authChecked, user, router, getUserId, loadGeofences]);

  // Monitor WebSocket connection status
  useEffect(() => {
    setWsConnected(isConnected);
    if (isConnected) {
      console.log('✅ Dashboard: WebSocket connected - waiting for latest GPS data');
    } else {
      console.warn('⚠️ Dashboard: WebSocket disconnected');
    }
  }, [isConnected]);

  // Process WebSocket data untuk mendapatkan koordinat terbaru
  useEffect(() => {
    if (wsData && wsData.data && wsData.data.length > 0) {
      console.log('📡 Received WebSocket data:', wsData.data.length, 'coordinates');
      
      // Check if this is initial load with latest data
      if (wsData.isInitialLoad) {
        console.log('🎯 Initial load with latest positions only');
      }
      
      const newPositions = {};
      let hasValidData = false;
      
      // Process WebSocket data untuk mendapatkan koordinat terbaru
      wsData.data.forEach(coord => {
        if (coord && coord.gps_id) {
          const lat = parseFloat(coord.latitude);
          const lng = parseFloat(coord.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // For initial load, data is already filtered to latest only
            // For real-time updates, we still need to check timestamps
            const currentTime = new Date(coord.timestamp);
            const existingTime = newPositions[coord.gps_id]?.timestamp ? 
              new Date(newPositions[coord.gps_id].timestamp) : new Date(0);
            
            // Only update if this is newer data or initial load
            if (wsData.isInitialLoad || currentTime >= existingTime) {
              newPositions[coord.gps_id] = {
                lat,
                lng,
                timestamp: coord.timestamp,
                speed: coord.speed || 0,
                ignition_status: coord.ignition_status,
                battery_level: coord.battery_level,
                fuel_level: coord.fuel_level,
                isRealTimeUpdate: true,
                isLatestData: coord.isLatestData || false,
                savedAt: Date.now()
              };
              hasValidData = true;
            }
          }
        }
      });

      if (hasValidData) {
        setLatestWebSocketPositions(newPositions);
        
        // Mark bahwa sudah menerima data WebSocket
        if (!hasReceivedWebSocketData) {
          setHasReceivedWebSocketData(true);
          console.log('🎯 First valid WebSocket data received with latest positions - map will be shown');
        }
        
        // Save to localStorage untuk recovery setelah refresh
        saveRealtimePositions(Object.keys(newPositions).map(gpsId => ({
          gps_id: gpsId,
          position: newPositions[gpsId]
        })));
      }
    }
  }, [wsData, hasReceivedWebSocketData]);

  // Kontrol tampilan map: tunggu WebSocket data atau fallback ke cached data
  useEffect(() => {
    if (vehicles.length === 0) {
      setShowMap(false);
      return;
    }

    // Prioritas 1: WebSocket data terbaru
    if (hasReceivedWebSocketData && Object.keys(latestWebSocketPositions).length > 0) {
      setShowMap(true);
      console.log('🗺️ Showing map with latest WebSocket data');
      return;
    }

    // Prioritas 2: Cached data sebagai fallback (untuk recovery setelah refresh)
    const cachedPositions = loadRealtimePositions();
    if (Object.keys(cachedPositions).length > 0) {
      setShowMap(true);
      console.log('🗺️ Showing map with cached positions (fallback)');
      return;
    }

    // Jika tidak ada data sama sekali, tunggu WebSocket
    setShowMap(false);
    console.log('⏳ Waiting for WebSocket data before showing map');
  }, [vehicles.length, hasReceivedWebSocketData, latestWebSocketPositions]);

  // Vehicles dengan position terbaru dari WebSocket
  const updatedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    console.group('🔄 Dashboard: Processing vehicles with latest WebSocket data');
    console.log('Base vehicles:', vehicles.length);
    console.log('Latest WebSocket positions:', Object.keys(latestWebSocketPositions).length);
    console.log('Has received WebSocket data:', hasReceivedWebSocketData);

    const result = vehicles.map(vehicle => {
      let finalPosition = null;
      
      // PRIORITAS 1: Data WebSocket terbaru
      const wsPosition = latestWebSocketPositions[vehicle.gps_id];
      if (wsPosition) {
        finalPosition = wsPosition;
        console.log(`🔴 Using latest WebSocket position for ${vehicle.name}`);
      } else {
        // PRIORITAS 2: Fallback ke cached data (untuk recovery)
        const cachedPositions = loadRealtimePositions();
        const cachedPosition = cachedPositions[vehicle.gps_id];
        if (cachedPosition && cachedPosition.isRealTimeUpdate) {
          finalPosition = cachedPosition;
          console.log(`📱 Using cached position for ${vehicle.name} (fallback)`);
        }
      }
      
      return {
        ...vehicle,
        position: finalPosition // null jika tidak ada data real-time
      };
    });
    
    const vehiclesWithPosition = result.filter(v => v.position);
    console.log(`✅ Processed ${result.length} total vehicles, ${vehiclesWithPosition.length} with positions`);
    console.groupEnd();
    
    return result;
  }, [vehicles, latestWebSocketPositions, hasReceivedWebSocketData]);

  // Function to handle sidebar state changes - dengan useCallback untuk prevent infinite loop
  const handleSidebarStateChange = useCallback((newState) => {
    setSidebarState(prevState => {
      // Only update if state actually changed
      if (
        prevState.isSidebarVisible !== newState.isSidebarVisible ||
        prevState.activePanel !== newState.activePanel ||
        prevState.sidebarWidth !== newState.sidebarWidth
      ) {
        return newState;
      }
      return prevState;
    });
  }, []);

  // Backup polling untuk metadata saja (bukan position)
  useEffect(() => {
    if (!wsConnected && vehicles.length > 0) {
      console.log('🔄 WebSocket disconnected, enabling backup polling for metadata only');
      
      const backupInterval = setInterval(async () => {
        try {
          const userVehicles = await getUserVehicles();
          // Hanya update metadata, posisi tetap dari WebSocket/cache
          const updatedVehicles = userVehicles.map(vehicle => ({
            ...vehicle,
            position: null
          }));
          setVehicles(updatedVehicles);
          console.log('🔄 Updated vehicle metadata via backup polling');
        } catch (error) {
          console.error('Backup polling error:', error);
        }
      }, 30000); // Setiap 30 detik untuk metadata

      return () => clearInterval(backupInterval);
    }
  }, [wsConnected, vehicles.length]);

  // REAL-TIME GEOFENCE VIOLATION DETECTION
  useEffect(() => {
    if (updatedVehicles.length > 0 && geofences.length > 0) {
      console.log('🔄 Dashboard: Running geofence detection with latest WebSocket data');
      checkVehicleGeofenceViolations(updatedVehicles, geofences);
    }
  }, [updatedVehicles, geofences, checkVehicleGeofenceViolations]);

  // Error handling functions
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage('');
  };

  // Handler functions
  const handleHistoryClick = async (vehicleId, startDate, endDate) => {
    if (!vehicleId) return;

    try {
      const existingVehicle = updatedVehicles.find(v => v.vehicle_id === vehicleId);
      if (!existingVehicle) {
        showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
        return;
      }

      if (!existingVehicle.gps_id) {
        showErrorMessage(`Kendaraan ${existingVehicle.name} belum memiliki GPS ID. Tidak bisa menampilkan history.`);
        return;
      }

      const historyUrl = `/api/history?gps_id=${encodeURIComponent(existingVehicle.gps_id)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

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

      const pathCoords = data.data.map(coord => ({
        lat: parseFloat(coord.latitude),
        lng: parseFloat(coord.longitude),
        timestamp: coord.timestamp
      }));

      setSelectedVehicle({
        ...existingVehicle,
        path: pathCoords
      });

    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
      showErrorMessage("Gagal memuat riwayat kendaraan: " + err.message);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    if (!vehicle) {
      setSelectedVehicle(null);
      return;
    }
    
    const existingVehicle = vehicles.find(v => v.vehicle_id === vehicle.vehicle_id);
    if (!existingVehicle) {
      showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
      return;
    }
    setSelectedVehicle(existingVehicle);
  };

  const handleHideHistory = () => {
    if (selectedVehicle) {
      setSelectedVehicle({
        ...selectedVehicle,
        path: undefined
      });
    }
  };

  const handleTambahKendaraan = () => {
    setShowTambahModal(true);
  };

  const handleTambahSukses = (newVehicle) => {
    setVehicles(prevVehicles => [...prevVehicles, {
      ...newVehicle,
      position: null
    }]);
    
    setShowTambahModal(false);
  };

  const handleSetGeofence = () => {
    if (vehicles.length === 0) {
      setErrorMessage('Tidak ada kendaraan tersedia! Tambahkan kendaraan terlebih dahulu.');
      setShowErrorAlert(true);
      return;
    }
    
    setShowGeofenceModal(true);
  };

  const handleStartDrawing = (start = true, type = 'polygon') => {
    setIsDrawingMode(start);
    setDrawingType(type);
  };

  const handlePolygonComplete = (coordinates) => {
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handlePolygonComplete(coordinates);
    }
  };

  const handleCircleComplete = (circleData) => {
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handleCircleComplete(circleData);
    }
  };

  const handleGeofenceSukses = async () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setDrawingType('polygon');
    
    try {
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          const vehiclesWithoutPosition = userVehicles.map(vehicle => ({
            ...vehicle,
            position: null
          }));
          setVehicles(vehiclesWithoutPosition);
          if (selectedVehicle) {
            const updatedSelectedVehicle = vehiclesWithoutPosition.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
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

  const handleGeofenceDeleted = async () => {
    try {
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          const vehiclesWithoutPosition = userVehicles.map(vehicle => ({
            ...vehicle,
            position: null
          }));
          setVehicles(vehiclesWithoutPosition);
          if (selectedVehicle) {
            const updatedSelectedVehicle = vehiclesWithoutPosition.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
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

  const handleCloseGeofenceModal = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setDrawingType('polygon');
  };

  const handleToggleGeofence = (vehicleId, isVisible) => {
    setVehicleGeofenceVisibility(prev => ({
      ...prev,
      [vehicleId]: isVisible
    }));
  };

  const getVisibleGeofences = () => {
    const filtered = geofences.filter(geofence => {
      const vehicleUsingThisGeofence = updatedVehicles.find(vehicle => 
        vehicle.geofence_id === geofence.geofence_id
      );
      
      if (!vehicleUsingThisGeofence) {
        return false;
      }
      
      const vehicleIdStr = String(vehicleUsingThisGeofence.vehicle_id);
      const isVisible = vehicleGeofenceVisibility[vehicleIdStr] === true;
      
      return isVisible;
    });
    
    return filtered;
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = getUserId(user);

      const response = await fetch(`/api/HapusKendaraan?id=${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menghapus kendaraan');
      }
      
      const filteredVehicles = vehicles.filter(vehicle => vehicle.vehicle_id !== vehicleId);
      setVehicles(filteredVehicles);
      
      if (selectedVehicle && selectedVehicle.vehicle_id === vehicleId) {
        setSelectedVehicle(filteredVehicles.length > 0 ? filteredVehicles[0] : null);
      }
      
      return true;
      
    } catch (error) {
      console.error('Error menghapus kendaraan:', error);
      throw error;
    }
  };

  // Function to handle update vehicle
  const handleUpdateVehicle = (vehicleId, updates) => {
    setVehicles(prevVehicles => 
      prevVehicles.map(vehicle => 
        vehicle.vehicle_id === vehicleId 
          ? { ...vehicle, ...updates }
          : vehicle
      )
    );

    if (selectedVehicle && selectedVehicle.vehicle_id === vehicleId) {
      setSelectedVehicle(prevSelected => ({
        ...prevSelected,
        ...updates
      }));
    }
  };

  // Show loading while checking auth
  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm font-medium">Loading VehiTrack Dashboard...</p>
          <p className="text-gray-400 text-xs mt-2">
            {!authChecked ? 'Verifying authentication...' : 'Loading data...'}
          </p>
          {authChecked && (
            <p className="text-blue-400 text-xs mt-1">
              🎯 Waiting for latest GPS data...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden" style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>

      {/* Full Screen Map Container - Hanya tampil jika sudah ada data terbaru */}
      <div className="absolute inset-0 w-full h-full z-0" style={{ pointerEvents: 'auto' }}>
        {showMap && vehicles.length > 0 ? (
          <div className="w-full h-full relative" style={{ zIndex: isDrawingMode ? 1 : 0, pointerEvents: 'auto' }}>
            <MapComponent
              ref={mapRef}
              vehicles={updatedVehicles}
              selectedVehicle={selectedVehicle}
              isDrawingMode={isDrawingMode}
              drawingType={drawingType}
              onPolygonComplete={handlePolygonComplete}
              onCircleComplete={handleCircleComplete}
              geofences={getVisibleGeofences()}
              allGeofences={geofences}
              onGeofenceDeleted={handleGeofenceDeleted}
              checkVehicleGeofenceViolations={checkVehicleGeofenceViolations}
              sidebarWidth={sidebarState.sidebarWidth}
              isSidebarVisible={sidebarState.isSidebarVisible}
              activePanel={sidebarState.activePanel}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100" style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
            <div className="text-center">
              {vehicles.length === 0 ? (
                <>
                  <p className="text-gray-600 text-lg mb-2">Tidak ada data kendaraan</p>
                  <p className="text-gray-500 text-sm">Tambahkan kendaraan untuk melihat peta</p>
                </>
              ) : (
                <>
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-600 text-lg mb-2">Menunggu Data GPS Terbaru</p>
                  <p className="text-gray-500 text-sm mb-2">
                    {wsConnected ? 'Koneksi WebSocket aktif...' : 'Menghubungkan ke server...'}
                  </p>
                  <div className="text-xs text-gray-400">
                    <p>Kendaraan: {vehicles.length}</p>
                    <p>Status: {hasReceivedWebSocketData ? 'Data diterima' : 'Menunggu data terbaru'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Sidebar - Sembunyikan saat mode drawing aktif */}
      {!isDrawingMode && (
        <div className="absolute top-0 left-0 z-40" style={{ pointerEvents: 'auto' }}>
          <SidebarComponent 
            vehicles={updatedVehicles}
            onSelectVehicle={handleSelectVehicle}
            onHistoryClick={handleHistoryClick}
            onTambahKendaraan={handleTambahKendaraan}
            onDeleteVehicle={handleDeleteVehicle}
            onSetGeofence={handleSetGeofence}
            selectedVehicle={selectedVehicle}
            geofences={geofences}
            onToggleGeofence={handleToggleGeofence}
            onHideHistory={handleHideHistory}
            onUpdateVehicle={handleUpdateVehicle}
            onSidebarStateChange={handleSidebarStateChange}
          />
        </div>
      )}
            
      {/* Geofence Notifications */}
      <div className={`absolute right-4 z-60 space-y-1.5 max-w-[220px] w-full transition-all duration-300 ${
        isDrawingMode ? 'top-8' : 'top-8'
      }`} style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
        {geofenceNotifications.map((notification) => (
          <GeofenceNotification
            key={notification.id}
            notification={notification}
            onRemove={removeGeofenceNotification}
            autoRemoveDelay={10000}
          />
        ))}
        
        {geofenceNotifications.length > 1 && (
          <div className="flex justify-end">
            <button 
              onClick={removeAllGeofenceNotifications}
              className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-2.5 py-1 rounded-md transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              Tutup Semua ({geofenceNotifications.length})
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGeofenceModal && (
        <div className="absolute inset-0 z-[9998]" style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
          <ModalSetGeofence
            ref={geofenceModalRef}
            onClose={handleCloseGeofenceModal}
            onSucceed={handleGeofenceSukses}
            onStartDrawing={handleStartDrawing}
            vehicles={updatedVehicles}
            selectedVehicle={selectedVehicle}
          />
        </div>
      )}

      {showTambahModal && (
        <div className="absolute inset-0 z-[9999]" style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
          <ModalTambahKendaraan
            onClose={() => setShowTambahModal(false)}
            onSucceed={handleTambahSukses}
          />
        </div>
      )}

      {/* Error Alert */}
      {showErrorAlert && (
        <div className="absolute inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center" style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}>
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm mx-4">
            <h3 className="text-base font-bold mb-3 text-red-500 text-center">Error</h3>
            <p className="mb-3 text-center text-sm text-gray-700">
              {errorMessage}
            </p>
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleCloseErrorAlert}
                className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors duration-200"
              >
                OK
              </button>
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
        className="toast-container !z-[9999]"
        toastClassName="toast-item"
        style={{ pointerEvents: isDrawingMode ? 'none' : 'auto' }}
      />
    </div>
  );
}

// =============================================================================
// SERVER-SIDE PROPS: Kembalikan array kosong untuk multi-user security
// =============================================================================
export async function getServerSideProps() {
  return {
    props: {}
  };
}