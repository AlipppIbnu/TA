// pages/dashboard.js - FIXED VERSION - No Initial Server Positions
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
const POSITION_CACHE_DURATION = 10 * 60 * 1000; // 10 menit (diperpanjang)

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

// Modal Tambah Kendaraan (unchanged)
function ModalTambahKendaraan({ onClose, onSucceed }) {
  // ... existing modal code remains the same
  return <div>Modal code unchanged</div>;
}

export default function Dashboard({ vehicles: initialVehicles = [] }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);

  const {
    notifications: geofenceNotifications,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications,
    checkVehicleGeofenceViolations
  } = useGeofenceNotifications(10000);

  const { data: wsData, isConnected } = useWebSocket();

  // State untuk vehicles - TANPA position dari server
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // =============================================================================
  // ZERO INITIAL POSITION STRATEGY
  // =============================================================================
  
  // State untuk cached positions dari localStorage
  const [cachedPositions, setCachedPositions] = useState(() => loadRealtimePositions());
  
  // State untuk tracking apakah WebSocket sudah connect
  const [wsConnected, setWsConnected] = useState(false);
  
  // State untuk tracking apakah sudah ada position data
  const [hasAnyPositionData, setHasAnyPositionData] = useState(false);
  
  // State untuk tracking apakah marker sudah di posisi terakhir
  const [markersAtLatestPosition, setMarkersAtLatestPosition] = useState(false);

  // Monitor WebSocket connection
  useEffect(() => {
    setWsConnected(isConnected);
    if (isConnected) {
      console.log('✅ WebSocket connected - real-time positions incoming');
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

  // PERBAIKAN UTAMA: updatedVehicles dengan ZERO initial position strategy
  const updatedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    console.group('🔄 Dashboard: Processing vehicles (ZERO INITIAL POSITION)');
    console.log('Base vehicles:', vehicles.length);
    console.log('Cached positions:', Object.keys(cachedPositions).length);
    console.log('WebSocket GPS data points:', wsData?.data?.length || 0);
    console.log('WebSocket connected:', isConnected);

    const result = vehicles.map(vehicle => {
      // STRATEGI BARU: Mulai dari null, hanya gunakan real-time data
      let finalPosition = null;
      
      // 1. PERTAMA: Cek cached position (dari localStorage setelah refresh)
      const cachedPosition = cachedPositions[vehicle.gps_id];
      if (cachedPosition && cachedPosition.isRealTimeUpdate) {
        finalPosition = cachedPosition;
        console.log(`📱 CACHED: Using cached position for ${vehicle.name}`);
      }
      
      // 2. KEDUA: Cek WebSocket data terbaru (SELALU OVERRIDE cached)
      if (wsData && wsData.data && wsData.data.length > 0) {
        const latestCoord = wsData.data
          .filter(coord => coord && coord.gps_id === vehicle.gps_id)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (latestCoord) {
          const lat = parseFloat(latestCoord.latitude);
          const lng = parseFloat(latestCoord.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const wsTime = new Date(latestCoord.timestamp);
            const cachedTime = finalPosition?.timestamp ? new Date(finalPosition.timestamp) : new Date(0);
            
            // Gunakan WebSocket data jika lebih baru atau jika tidak ada cached data
            if (wsTime >= cachedTime) {
              finalPosition = {
                lat,
                lng,
                timestamp: latestCoord.timestamp,
                speed: latestCoord.speed || 0,
                ignition_status: latestCoord.ignition_status,
                battery_level: latestCoord.battery_level,
                fuel_level: latestCoord.fuel_level,
                isRealTimeUpdate: true
              };
              console.log(`🔴 WEBSOCKET: Using fresh WebSocket position for ${vehicle.name}:`, {
                lat, lng, speed: latestCoord.speed || 0
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

  // State untuk modal dan geofence
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingType, setDrawingType] = useState('polygon');
  const [geofences, setGeofences] = useState([]);
  const [vehicleGeofenceVisibility, setVehicleGeofenceVisibility] = useState({});

  // Load user dan vehicles - SIMPLIFIED tanpa position loading
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

        // PERBAIKAN: Langsung set vehicles dari server (tanpa position)
        // Tidak ada fetch background yang menyebabkan re-render
        const vehiclesWithoutPosition = (initialVehicles || []).map(vehicle => ({
          ...vehicle,
          position: null // Forced null - akan diisi oleh WebSocket/cache
        }));
        
        setVehicles(vehiclesWithoutPosition);
        
        if (vehiclesWithoutPosition.length > 0) {
          setSelectedVehicle(vehiclesWithoutPosition[0]);
        }

        console.log('✅ ZERO INITIAL: Vehicles loaded without positions, waiting for real-time data...');
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

  // Check if we have any position data
  useEffect(() => {
    const hasPositions = Object.keys(cachedPositions).length > 0 || 
                        (wsData && wsData.data && wsData.data.length > 0);
    
    if (hasPositions && !hasAnyPositionData) {
      setHasAnyPositionData(true);
      console.log('✅ Position data available (cached or WebSocket)');
    }
  }, [cachedPositions, wsData, hasAnyPositionData]);

  // Muat geofences
  const loadGeofences = async () => {
    try {
      const response = await fetch('/api/geofences');
      if (!response.ok) throw new Error('Failed to fetch geofences');

      const data = await response.json();
      if (data.success) {
        setGeofences(data.data || []);
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
      setGeofences([]);
    }
  };

  // SIMPLIFIED: Reduced polling, only when absolutely necessary
  useEffect(() => {
    if (!isConnected && vehicles.length > 0) {
      console.log('🔄 WebSocket disconnected, enabling backup polling');
      
      const backupInterval = setInterval(async () => {
        try {
          const userVehicles = await getUserVehicles();
          // Only update vehicle metadata, NOT positions
          const updatedVehicles = userVehicles.map(vehicle => ({
            ...vehicle,
            position: null // Keep positions null, let WebSocket/cache handle it
          }));
          setVehicles(updatedVehicles);
        } catch (error) {
          console.error('Backup polling error:', error);
        }
      }, 15000); // Every 15 seconds when disconnected

      return () => clearInterval(backupInterval);
    }
  }, [isConnected, vehicles.length]);

  // Geofence detection
  useEffect(() => {
    if (updatedVehicles.length > 0 && geofences.length > 0) {
      checkVehicleGeofenceViolations(updatedVehicles, geofences);
    }
  }, [updatedVehicles, geofences, checkVehicleGeofenceViolations]);

  // Cleanup localStorage on unmount
  useEffect(() => {
    return () => {
      const positions = loadRealtimePositions();
      const now = Date.now();
      const cleanPositions = {};
      
      Object.keys(positions).forEach(gpsId => {
        if (now - positions[gpsId].savedAt < POSITION_CACHE_DURATION) {
          cleanPositions[gpsId] = positions[gpsId];
        }
      });
      
      if (Object.keys(cleanPositions).length !== Object.keys(positions).length) {
        localStorage.setItem(REALTIME_POSITIONS_KEY, JSON.stringify(cleanPositions));
      }
    };
  }, []);

  // Enhanced loading screen
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-sm font-medium">Loading VehiTrack Dashboard...</p>
        <p className="text-gray-400 text-xs mt-2">
          Vehicles: {vehicles.length} | WebSocket: {wsConnected ? 'Connected' : 'Connecting...'}
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
      </div>
    </div>
  );

  // Handler functions (unchanged)
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage('');
  };

  // ... rest of handler functions remain the same
  
  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">
      {/* Full Screen Map Container */}
      <div className="absolute inset-0 w-full h-full z-0">
        {vehicles.length > 0 ? (
          <MapComponent
            ref={mapRef}
            vehicles={updatedVehicles}
            selectedVehicle={selectedVehicle}
            isDrawingMode={isDrawingMode}
            drawingType={drawingType}
            // ... other props
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

      {/* Floating Sidebar */}
      <div className="absolute top-0 left-0 z-40">
        <SidebarComponent 
          vehicles={updatedVehicles}
          // ... other props
        />
      </div>

      {/* Status indicator untuk development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs">
          <div className="space-y-1">
            <div>🔌 WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}</div>
            <div>📱 Cached: {Object.keys(cachedPositions).length} positions</div>
            <div>🚗 Vehicles: {updatedVehicles.length} total, {updatedVehicles.filter(v => v.position?.isRealTimeUpdate).length} real-time</div>
            <div>⚡ Has Position Data: {hasAnyPositionData ? '✅ Yes' : '⏳ Waiting'}</div>
            <div className="text-green-400">🎯 ZERO INITIAL POSITION MODE</div>
          </div>
        </div>
      )}

      {/* Modals and other components remain the same */}
    </div>
  );
}

// =============================================================================
// PERBAIKAN SERVER-SIDE PROPS: NO POSITION DATA
// =============================================================================
export async function getServerSideProps() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // HANYA fetch vehicle metadata, TIDAK position data
    const resVehicles = await fetch(`${directusConfig.baseURL}/items/vehicle`, {
      signal: controller.signal,
      headers: directusConfig.headers
    });
    
    clearTimeout(timeoutId);

    if (!resVehicles.ok) {
      throw new Error("Gagal fetch vehicle data dari server");
    }

    const vehiclesData = await resVehicles.json();

    // PERBAIKAN: Return vehicles tanpa position data
    const vehicles = vehiclesData.data.map(vehicle => ({
      ...vehicle,
      position: null // SELALU null - real-time positions only
    }));

    console.log('🚀 SSR: Vehicles loaded WITHOUT position data:', vehicles.length);

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