// pages/dashboard.js - Complete Fix with Zero Initial Position + Solution 1+2
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import SidebarComponent from "../components/SidebarComponent";
import ModalSetGeofence from "@/components/ModalSetGeofence";
import useGeofenceNotifications from "@/components/hooks/useGeofenceNotifications";
import { getCurrentUser, isAuthenticated } from "@/lib/authService";
import { getUserVehicles, addVehicle } from "@/lib/vehicleService";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import directusConfig from "@/lib/directusConfig";
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

export default function Dashboard({ vehicles: initialVehicles = [] }) {
  const router = useRouter();
  
  // Refs
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);

  // Hook notifikasi geofence dengan real-time detection
  const {
    notifications: geofenceNotifications,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications,
    checkVehicleGeofenceViolations
  } = useGeofenceNotifications(10000);

  // Hook WebSocket untuk real-time GPS updates
  const { data: wsData, isConnected, getConnectionStats } = useWebSocket();

  // State untuk user dan loading
  const [loading, setLoading] = useState(true);
  
  // State untuk kendaraan - initialize tanpa position dari server
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // =============================================================================
  // SOLUSI 1 + 2: Zero Initial Position + WebSocket Priority + localStorage Persistence
  // =============================================================================
  
  // State untuk cached positions dari localStorage
  const [cachedPositions, setCachedPositions] = useState(() => loadRealtimePositions());
  
  // State untuk tracking WebSocket connection
  const [wsConnected, setWsConnected] = useState(false);
  
  // State untuk tracking apakah sudah ada position data
  const [hasAnyPositionData, setHasAnyPositionData] = useState(false);

  // Monitor WebSocket connection status
  useEffect(() => {
    setWsConnected(isConnected);
    if (isConnected) {
      console.log('✅ Dashboard: WebSocket connected - real-time GPS data active');
    } else {
      console.warn('⚠️ Dashboard: WebSocket disconnected - using cached positions');
    }
  }, [isConnected]);

  // Update cachedPositions ketika ada data WebSocket baru
  useEffect(() => {
    if (wsData && wsData.data && wsData.data.length > 0) {
      const newPositions = { ...cachedPositions };
      let hasUpdates = false;
      
      wsData.data.forEach(coord => {
        if (coord && coord.gps_id) {
          const lat = parseFloat(coord.latitude);
          const lng = parseFloat(coord.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const currentTime = new Date(coord.timestamp);
            const existingTime = newPositions[coord.gps_id]?.timestamp ? 
              new Date(newPositions[coord.gps_id].timestamp) : new Date(0);
            
            // Only update if this is newer data
            if (currentTime > existingTime) {
              newPositions[coord.gps_id] = {
                lat,
                lng,
                timestamp: coord.timestamp,
                speed: coord.speed || 0,
                ignition_status: coord.ignition_status,
                battery_level: coord.battery_level,
                fuel_level: coord.fuel_level,
                isRealTimeUpdate: true,
                savedAt: Date.now()
              };
              hasUpdates = true;
            }
          }
        }
      });
      
      if (hasUpdates) {
        setCachedPositions(newPositions);
        // Save to localStorage
        saveRealtimePositions(Object.keys(newPositions).map(gpsId => ({
          gps_id: gpsId,
          position: newPositions[gpsId]
        })));
        
        if (!hasAnyPositionData) {
          setHasAnyPositionData(true);
          console.log('✅ First position data received via WebSocket');
        }
      }
    }
  }, [wsData, cachedPositions, hasAnyPositionData]);

  // ZERO INITIAL POSITION: updatedVehicles dengan priority: WebSocket > Cached > null
  const updatedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    console.group('🔄 Dashboard: Processing vehicles (ZERO INITIAL POSITION STRATEGY)');
    console.log('Base vehicles:', vehicles.length);
    console.log('Cached positions:', Object.keys(cachedPositions).length);
    console.log('WebSocket GPS data points:', wsData?.data?.length || 0);
    console.log('WebSocket connected:', isConnected);

    const result = vehicles.map(vehicle => {
      // STRATEGI ZERO INITIAL: Mulai dari null, hanya gunakan real-time data
      let finalPosition = null;
      
      // 1. PERTAMA: Cek cached position (localStorage setelah refresh)
      const cachedPosition = cachedPositions[vehicle.gps_id];
      if (cachedPosition && cachedPosition.isRealTimeUpdate) {
        finalPosition = cachedPosition;
        console.log(`📱 CACHED: Using cached position for ${vehicle.name}`);
      }
      
      // 2. KEDUA: Cek WebSocket data terbaru (SELALU OVERRIDE cached jika lebih baru)
      if (wsData && wsData.data && wsData.data.length > 0) {
        const coordinateUpdates = {};
        
        // Get latest coordinate for this vehicle from WebSocket
        wsData.data.forEach(coord => {
          if (coord && coord.gps_id === vehicle.gps_id) {
            const existing = coordinateUpdates[coord.gps_id];
            if (!existing || (coord.timestamp && existing.timestamp && 
                new Date(coord.timestamp) > new Date(existing.timestamp))) {
              coordinateUpdates[coord.gps_id] = coord;
            }
          }
        });

        const wsUpdate = coordinateUpdates[vehicle.gps_id];
        if (wsUpdate) {
          const lat = parseFloat(wsUpdate.latitude);
          const lng = parseFloat(wsUpdate.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const wsTime = new Date(wsUpdate.timestamp);
            const cachedTime = finalPosition?.timestamp ? new Date(finalPosition.timestamp) : new Date(0);
            
            // Selalu gunakan data WebSocket jika tersedia dan lebih baru
            if (wsTime >= cachedTime) {
              finalPosition = {
                lat,
                lng,
                timestamp: wsUpdate.timestamp,
                speed: wsUpdate.speed || 0,
                ignition_status: wsUpdate.ignition_status,
                battery_level: wsUpdate.battery_level,
                fuel_level: wsUpdate.fuel_level,
                isRealTimeUpdate: true
              };
              console.log(`🔴 WEBSOCKET: Using fresh WebSocket position for ${vehicle.name}:`, {
                lat, lng, speed: wsUpdate.speed || 0
              });
            }
          }
        }
      }
      
      return {
        ...vehicle,
        position: finalPosition // null jika tidak ada data real-time
      };
    });
    
    const vehiclesWithPosition = result.filter(v => v.position);
    console.log(`✅ ZERO INITIAL: Processed ${result.length} total vehicles, ${vehiclesWithPosition.length} with real-time positions`);
    console.groupEnd();
    
    return result;
  }, [vehicles, wsData, cachedPositions, isConnected]);
  
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

  // ZERO INITIAL POSITION: Load user data dan kendaraan tanpa position loading
  useEffect(() => {
    const loadUserAndVehicles = async () => {
      try {
        if (!isAuthenticated()) {
          router.push("/auth/login");
          return;
        }

        const userData = getCurrentUser();
        if (!userData) {
          router.push("/auth/login");
          return;
        }

        // PERBAIKAN: Langsung set vehicles dari server tanpa position
        // Tidak ada background fetch yang menyebabkan re-render
        const vehiclesWithoutPosition = (initialVehicles || []).map(vehicle => ({
          ...vehicle,
          position: null // Forced null - akan diisi oleh WebSocket/cache
        }));
        
        setVehicles(vehiclesWithoutPosition);
        
        if (vehiclesWithoutPosition.length > 0) {
          setSelectedVehicle(vehiclesWithoutPosition[0]);
        }

        console.log('✅ ZERO INITIAL: Vehicles loaded without server positions, waiting for real-time data...');
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
  }, [router, initialVehicles]);

  // Check if we have any position data (cached or real-time)
  useEffect(() => {
    const hasPositions = Object.keys(cachedPositions).length > 0 || 
                        (wsData && wsData.data && wsData.data.length > 0);
    
    if (hasPositions && !hasAnyPositionData) {
      setHasAnyPositionData(true);
      console.log('✅ Position data available (cached or WebSocket)');
    }
  }, [cachedPositions, wsData, hasAnyPositionData]);

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
    }
  };

  // SIMPLIFIED: Reduced polling hanya untuk metadata, bukan position
  useEffect(() => {
    if (!isConnected && vehicles.length > 0) {
      console.log('🔄 WebSocket disconnected, enabling minimal backup polling for metadata only');
      
      const backupInterval = setInterval(async () => {
        try {
          const userVehicles = await getUserVehicles();
          // Only update vehicle metadata, NOT positions
          const updatedVehicles = userVehicles.map(vehicle => ({
            ...vehicle,
            position: null // Keep positions null, let WebSocket/cache handle it
          }));
          setVehicles(updatedVehicles);
          console.log('🔄 Updated vehicle metadata via backup polling');
        } catch (error) {
          console.error('Backup polling error:', error);
        }
      }, 30000); // Every 30 seconds when disconnected (for metadata only)

      return () => clearInterval(backupInterval);
    }
  }, [isConnected, vehicles.length]);

  // REAL-TIME GEOFENCE VIOLATION DETECTION
  useEffect(() => {
    if (updatedVehicles.length > 0 && geofences.length > 0) {
      console.log('🔄 Dashboard: Running geofence detection with real-time data');
      checkVehicleGeofenceViolations(updatedVehicles, geofences);
    }
  }, [updatedVehicles, geofences, checkVehicleGeofenceViolations]);

  // Clean up localStorage saat component unmount
  useEffect(() => {
    return () => {
      const positions = loadRealtimePositions();
      const now = Date.now();
      const cleanPositions = {};
      
      Object.keys(positions).forEach(gpsId => {
        if (positions[gpsId] && (now - positions[gpsId].savedAt) < POSITION_CACHE_DURATION) {
          cleanPositions[gpsId] = positions[gpsId];
        }
      });
      
      if (Object.keys(cleanPositions).length !== Object.keys(positions).length) {
        localStorage.setItem(REALTIME_POSITIONS_KEY, JSON.stringify(cleanPositions));
        console.log('🧹 Cleaned up old cached positions');
      }
    };
  }, []);

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
            position: null // Keep zero initial position strategy
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
            position: null // Keep zero initial position strategy
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

  // Function to handle update vehicle (untuk relay status dll)
  const handleUpdateVehicle = (vehicleId, updates) => {
    setVehicles(prevVehicles => 
      prevVehicles.map(vehicle => 
        vehicle.vehicle_id === vehicleId 
          ? { ...vehicle, ...updates }
          : vehicle
      )
    );

    // Update selected vehicle jika sedang dipilih
    if (selectedVehicle && selectedVehicle.vehicle_id === vehicleId) {
      setSelectedVehicle(prevSelected => ({
        ...prevSelected,
        ...updates
      }));
    }
  };

  // Enhanced loading screen dengan informasi detail
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-sm font-medium">Loading VehiTrack Dashboard...</p>
        <p className="text-gray-400 text-xs mt-2">
          WebSocket: {wsConnected ? 'Connected' : 'Connecting...'}
        </p>
        {Object.keys(cachedPositions).length > 0 && (
          <p className="text-blue-400 text-xs mt-1">
            📱 Cached positions: {Object.keys(cachedPositions).length}
          </p>
        )}
        {!hasAnyPositionData && vehicles.length > 0 && (
          <p className="text-yellow-400 text-xs mt-1">
            ⏳ Waiting for real-time positions...
          </p>
        )}
        <p className="text-green-400 text-xs mt-1">
          🎯 ZERO INITIAL POSITION MODE
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">

      {/* Full Screen Map Container - Always full screen */}
      <div className="absolute inset-0 w-full h-full z-0">
        {vehicles.length > 0 ? (
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
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <p className="text-gray-600 text-lg mb-2">Tidak ada data kendaraan</p>
              <p className="text-gray-500 text-sm">Tambahkan kendaraan untuk melihat peta</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Sidebar - Using SidebarComponent with higher z-index */}
      <div className="absolute top-0 left-0 z-40">
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
        />
      </div>

      {/* Geofence Notifications - Floating on the right */}
      <div className={`absolute right-4 z-60 space-y-1.5 max-w-[220px] w-full transition-all duration-300 ${
        isDrawingMode ? 'top-8' : 'top-8'
      }`}>
        {geofenceNotifications.map((notification) => (
          <GeofenceNotification
            key={notification.id}
            notification={notification}
            onRemove={removeGeofenceNotification}
            autoRemoveDelay={10000}
          />
        ))}
        
        {/* Dismiss All Button */}
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

      {/* Debug Info - Development Mode Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 z-50 bg-black/90 text-white p-3 rounded-lg text-xs max-w-xs border border-gray-600">
          <div className="space-y-1">
            <div className="text-green-400 font-bold">🎯 ZERO INITIAL POSITION</div>
            <div>🔌 WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}</div>
            <div>📱 Cached: {Object.keys(cachedPositions).length} positions</div>
            <div>🚗 Vehicles: {updatedVehicles.length} total, {updatedVehicles.filter(v => v.position?.isRealTimeUpdate).length} real-time</div>
            <div>⚡ Position Data: {hasAnyPositionData ? '✅ Available' : '⏳ Waiting'}</div>
            <div>📊 WS Data Points: {wsData?.data?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showGeofenceModal && (
        <div className="absolute inset-0 z-[9998]">
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
        <div className="absolute inset-0 z-[9999]">
          <ModalTambahKendaraan
            onClose={() => setShowTambahModal(false)}
            onSucceed={handleTambahSukses}
          />
        </div>
      )}

      {/* Error Alert */}
      {showErrorAlert && (
        <div className="absolute inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
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
      />
    </div>
  );
}

// =============================================================================
// PERBAIKAN SERVER-SIDE PROPS: ZERO INITIAL POSITION STRATEGY
// =============================================================================
export async function getServerSideProps() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // HANYA fetch vehicle metadata, TIDAK termasuk position data
    const resVehicles = await fetch(`${directusConfig.baseURL}/items/vehicle`, {
      signal: controller.signal,
      headers: directusConfig.headers
    });
    
    clearTimeout(timeoutId);

    if (!resVehicles.ok) {
      console.error("Fetch failed:", { vehiclesStatus: resVehicles.status });
      throw new Error("Gagal fetch vehicle data dari server");
    }

    const vehiclesData = await resVehicles.json();

    // PERBAIKAN UTAMA: Return vehicles tanpa position data sama sekali
    // Position akan diload secara real-time via WebSocket atau localStorage cache
    const vehicles = vehiclesData.data.map(vehicle => ({
      ...vehicle,
      position: null // SELALU null dari server - real-time positions only
    }));

    console.log('🚀 SSR (ZERO INITIAL): Vehicles loaded WITHOUT position data:', vehicles.length);

    return { 
      props: { 
        vehicles 
      } 
    };
  } catch (err) {
    console.error("❌ Server-side fetch error:", err);
    
    return { 
      props: { 
        vehicles: [],
        error: {
          message: err.message || String(err),
          isTimeout: err.name === 'AbortError'
        }
      } 
    };
  }
}