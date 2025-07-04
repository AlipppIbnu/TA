// components/MapComponent.js - Komponen peta interaktif dengan positioning GPS real-time
import { MapContainer, TileLayer, Popup, Polygon, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from "react";
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import L from "leaflet";
import { getGeofenceStatus } from "@/utils/geofenceUtils";
import { createPortal } from 'react-dom';
import AnimatedMarker from './AnimatedMarker';

// Komponen HistoryPath - untuk menampilkan jalur riwayat kendaraan
const HistoryPath = ({ path }) => {
  if (!path || path.length === 0) return null;

  // Filter koordinat yang valid
  const validPath = path.filter(coord => 
    coord && 
    !isNaN(coord.lat) && !isNaN(coord.lng) &&
    coord.lat >= -90 && coord.lat <= 90 &&
    coord.lng >= -180 && coord.lng <= 180
  );

  if (validPath.length < 2) return null;

  return (
    <>
      {/* Garis riwayat */}
      <Polyline
        positions={validPath.map(coord => [coord.lat, coord.lng])}
        pathOptions={{
          color: "blue",
          weight: 3,
          opacity: 0.7
        }}
      />

      {/* Titik awal (Hijau) */}
      <Circle
        center={[validPath[0].lat, validPath[0].lng]}
        radius={8}
        pathOptions={{
          color: "green",
          fillColor: "green",
          fillOpacity: 1
        }}
      />

      {/* Titik akhir (Merah) */}
      <Circle
        center={[
          validPath[validPath.length - 1].lat,
          validPath[validPath.length - 1].lng
        ]}
        radius={8}
        pathOptions={{
          color: "red",
          fillColor: "red",
          fillOpacity: 1
        }}
      />
    </>
  );
};

// Ikon kendaraan pada peta
const vehicleIcon = new L.Icon({
  iconUrl: "/icon/logo_mobil.png",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

// Ikon titik polygon untuk mode drawing
const polygonPointIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4" r="3" fill="#ff0000" stroke="white" stroke-width="1"/>
    </svg>
  `),
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

// Komponen FlyToPosition - untuk navigasi otomatis ke lokasi tertentu
const FlyToPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 14);
    }
  }, [position, map]);

  return null;
};

// Komponen DrawingHandler - untuk menangani mode drawing geofence
const DrawingHandler = forwardRef((props, ref) => {
  const { isDrawingMode, drawingType, onPolygonComplete } = props;
  const map = useMap();
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [circleCenter, setCircleCenter] = useState(null);
  
  const tempMarkersRef = useRef([]);
  const tempPolylineRef = useRef(null);
  const tempCircleRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearTemporaryElements: () => {
      clearTemporaryElements();
    },
    getCurrentPolygon: () => currentPolygon,
    getIsDrawing: () => isDrawing
  }));

  const clearTemporaryElements = useCallback(() => {
    tempMarkersRef.current.forEach(marker => {
      try {
        if (marker && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch {
        // Error saat menghapus marker - tidak kritis
      }
    });
    tempMarkersRef.current = [];
    
    if (tempPolylineRef.current) {
      try {
        if (map.hasLayer(tempPolylineRef.current)) {
          map.removeLayer(tempPolylineRef.current);
        }
      } catch {
        // Error saat menghapus polyline - tidak kritis
      }
      tempPolylineRef.current = null;
    }
    
    if (tempCircleRef.current) {
      try {
        if (map.hasLayer(tempCircleRef.current)) {
          map.removeLayer(tempCircleRef.current);
        }
      } catch {
        // Error saat menghapus circle - tidak kritis
      }
      tempCircleRef.current = null;
    }
    
    setCurrentPolygon([]);
    setIsDrawing(false);
    setCircleCenter(null);
  }, [map]);

  useMapEvents({
    click: (e) => {
      console.log('Map click event:', { isDrawingMode, drawingType, e: e.latlng });
      if (!isDrawingMode) return;
      
      if (drawingType === "polygon") {
        const newPoint = [e.latlng.lat, e.latlng.lng];
        const newPolygon = [...currentPolygon, newPoint];
        
        console.log('Adding polygon point:', newPoint, 'Total points:', newPolygon.length);
        setCurrentPolygon(newPolygon);
        setIsDrawing(true);
        
        const marker = L.marker(e.latlng, {
          icon: polygonPointIcon,
          zIndexOffset: 1000
        }).addTo(map);
        
        tempMarkersRef.current.push(marker);
        
        if (newPolygon.length > 1) {
          if (tempPolylineRef.current) {
            map.removeLayer(tempPolylineRef.current);
          }
          
          const polyline = L.polyline(newPolygon, {
            color: 'red',
            weight: 1,
            dashArray: '3, 3'
          }).addTo(map);
          
          tempPolylineRef.current = polyline;
        }
      } else if (drawingType === "circle") {
        if (!isDrawing) {
          console.log('Setting circle center:', e.latlng);
          setCircleCenter(e.latlng);
          setIsDrawing(true);
          
          const marker = L.marker(e.latlng, {
            icon: polygonPointIcon,
            zIndexOffset: 1000
          }).addTo(map);
          
          tempMarkersRef.current = [marker];
        } else if (circleCenter) {
          const radius = circleCenter.distanceTo(e.latlng);
          console.log('Circle radius:', radius);
          
          if (radius >= 10) {
            onPolygonComplete({
              center: circleCenter,
              radius: radius
            });
            
            clearTemporaryElements();
          }
        }
      }
    },
    
    contextmenu: () => {
      console.log('Map contextmenu event:', { isDrawingMode, drawingType, currentPolygonLength: currentPolygon.length });
      if (!isDrawingMode) return;
      
      if (drawingType === "polygon" && currentPolygon.length >= 3) {
        console.log('Completing polygon with', currentPolygon.length, 'points');
        onPolygonComplete(currentPolygon);
        clearTemporaryElements();
      }
    },
    
    mousemove: (e) => {
      if (!isDrawingMode || drawingType !== "circle" || !isDrawing || !circleCenter) return;
      
      const radius = circleCenter.distanceTo(e.latlng);
      
      if (radius < 10) return;
      
      if (tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch {
          console.warn('Error removing temp circle in mousemove');
        }
        tempCircleRef.current = null;
      }
      
      try {
        const circle = L.circle(circleCenter, {
          radius: radius,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '3, 3'
        }).addTo(map);
        
        tempCircleRef.current = circle;
      } catch {
        console.warn('Error creating temp circle');
      }
    },
    
    movestart: () => {
      if (isDrawingMode && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch {
          console.warn('Error removing temp circle in movestart');
        }
        tempCircleRef.current = null;
      }
    },
    
    zoomstart: () => {
      if (isDrawingMode && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch {
          console.warn('Error removing temp circle in zoomstart');
        }
        tempCircleRef.current = null;
      }
    },
    
    dragstart: () => {
      if (isDrawingMode && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch {
          console.warn('Error removing temp circle in dragstart');
        }
        tempCircleRef.current = null;
      }
    },
    
    mouseout: () => {
      if (isDrawingMode && drawingType === "circle" && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch {
          console.warn('Error removing temp circle in mouseout');
        }
        tempCircleRef.current = null;
      }
    }
  });

  useEffect(() => {
    if (!isDrawingMode) {
      clearTemporaryElements();
    }
  }, [isDrawingMode, drawingType, clearTemporaryElements]);

  useEffect(() => {
    return () => {
      clearTemporaryElements();
    };
  }, [clearTemporaryElements]);

  useEffect(() => {
    if (!isDrawingMode || drawingType !== "circle") {
      clearTemporaryElements();
    }
  }, [isDrawingMode, drawingType, clearTemporaryElements]);

  useEffect(() => {
    if (isDrawingMode && drawingType === "circle") {
      const cleanupInterval = setInterval(() => {
        if (!isDrawing && tempCircleRef.current) {
          try {
            if (map.hasLayer(tempCircleRef.current)) {
              map.removeLayer(tempCircleRef.current);
            }
          } catch {
            console.warn('Error in periodic cleanup');
          }
          tempCircleRef.current = null;
        }
      }, 1000);

      return () => clearInterval(cleanupInterval);
    }
  }, [isDrawingMode, drawingType, isDrawing, map]);

  return (
    <>
      {drawingType === "polygon" && isDrawing && currentPolygon.length >= 3 && (
        <Polygon 
          positions={currentPolygon} 
          color="red" 
          fillColor="red" 
          fillOpacity={0.1}
          weight={1}
          dashArray="3, 3"
        />
      )}
    </>
  );
});

DrawingHandler.displayName = 'DrawingHandler';

// Main MapComponent with enhanced real-time GPS positioning
const MapComponent = forwardRef(({ 
  vehicles, 
  selectedVehicle, 
  isDrawingMode = false,
  drawingType = "polygon",
  onPolygonComplete,
  geofences = [],
  allGeofences = [],
  onGeofenceDeleted,
  checkVehicleGeofenceViolations
}, ref) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [flyToPositionWhenSelected, setFlyToPositionWhenSelected] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const lastFlyEventRef = useRef('');
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);

  // ENHANCED: Gunakan WebSocket untuk real-time updates dengan monitoring yang lebih baik
  const { data: wsData, isConnected, getConnectionStats } = useWebSocket();

  // REAL-TIME GEOFENCE NOTIFICATIONS: Use detection function from Dashboard
  // Note: MapComponent uses the checkVehicleGeofenceViolations function passed as prop
  // from Dashboard to ensure notifications are added to the correct state

  // Monitor WebSocket connection status dengan lebih detail
  useEffect(() => {
    const stats = getConnectionStats();
    if (!isConnected) {
      console.warn("⚠️ WebSocket disconnected - vehicle positions may be stale");
      console.log("Connection stats:", stats);
    } else {
      console.log("✅ WebSocket connected - real-time GPS updates active");
      console.log("Connection stats:", stats);
    }
  }, [isConnected, getConnectionStats]);

  // Proses dan gabungkan data koordinat dengan optimisasi untuk update real-time
  const updatedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    let result = [...vehicles];

    // Proses data GPS dengan prioritas timestamp terbaru
    if (wsData && wsData.data && wsData.data.length > 0) {
      const coordinateUpdates = {};
      
      // Kelompokkan berdasarkan gps_id dan ambil yang terbaru untuk setiap kendaraan
      wsData.data.forEach(coord => {
        if (coord && coord.gps_id) {
          const existing = coordinateUpdates[coord.gps_id];
          if (!existing || (coord.timestamp && existing.timestamp && 
              new Date(coord.timestamp) > new Date(existing.timestamp))) {
            coordinateUpdates[coord.gps_id] = coord;
          }
        }
      });

      // Update kendaraan dengan koordinat terbaru
      result = vehicles.map(vehicle => {
        const update = coordinateUpdates[vehicle.gps_id];
        
        if (update) {
          const newLat = parseFloat(update.latitude);
          const newLng = parseFloat(update.longitude);
          
          if (!isNaN(newLat) && !isNaN(newLng)) {
            // Untuk kendaraan yang belum punya posisi, langsung set tanpa flag perubahan
            const isFirstLoad = !vehicle.position;

            // Tambahkan key unik untuk trigger re-render AnimatedMarker
            const positionWithTimestamp = {
                lat: newLat,
                lng: newLng,
                timestamp: update.timestamp,
                speed: update.speed || 0,
                ignition_status: update.ignition_status,
                battery_level: update.battery_level,
                fuel_level: update.fuel_level,
              isFirstLoad, // Flag untuk AnimatedMarker
              updateId: `${newLat.toFixed(6)},${newLng.toFixed(6)},${update.timestamp}` // Identifier unik
            };

            return {
              ...vehicle,
              position: positionWithTimestamp
            };
          }
        }
        
        return vehicle;
      });
    }
    
    return result;
  }, [vehicles, wsData]);

  // REAL-TIME GEOFENCE VIOLATION DETECTION using WebSocket data (after updatedVehicles is defined)
  useEffect(() => {
    if (!checkVehicleGeofenceViolations) {
      console.warn('⚠️ MapComponent: checkVehicleGeofenceViolations function not provided as prop');
      return;
    }

    if (updatedVehicles.length > 0 && allGeofences.length > 0) {
      console.log('🔄 MapComponent: Running real-time geofence detection with WebSocket data...', {
        updatedVehicles: updatedVehicles.length,
        allGeofences: allGeofences.length,
        vehicleData: updatedVehicles.map(v => ({
          id: v.vehicle_id,
          name: v.name,
          hasPosition: !!v.position,
          position: v.position ? `${v.position.lat.toFixed(6)}, ${v.position.lng.toFixed(6)}` : null
        })),
        geofenceData: allGeofences.map(g => ({
          id: g.geofence_id,
          name: g.name,
          ruleType: g.rule_type,
          type: g.type
        }))
      });
      
      // Call real-time detection using WebSocket-updated vehicle data
      checkVehicleGeofenceViolations(updatedVehicles, allGeofences);
    } else {
      console.log('⚠️ MapComponent: Skipping geofence detection:', {
        noVehicles: updatedVehicles.length === 0,
        noGeofences: allGeofences.length === 0,
        hasFunction: !!checkVehicleGeofenceViolations
      });
    }
  }, [updatedVehicles, allGeofences, checkVehicleGeofenceViolations]);

  // ENHANCED: Connection status indicator untuk debugging
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getConnectionStats();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 WebSocket Status:', {
          connected: isConnected,
          dataPoints: stats.totalDataPoints,
          readyState: stats.readyState
        });
      }
    }, 30000); // Log every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, getConnectionStats]);

  // Initial map center calculation - Default ke Indonesia
  const initialCenter = useMemo(() => {
    // Koordinat pusat Indonesia (Jakarta)
    return [-6.2088, 106.8456];
  }, []);

  // ENHANCED: Expose functions to parent dengan posisi real-time
  useImperativeHandle(ref, () => ({
    flyToVehicle: (vehicleIdOrPosition) => {
      // FIXED: Support both vehicle ID dan direct position
      if (Array.isArray(vehicleIdOrPosition)) {
        // Direct position array [lat, lng]
        console.log('🎯 Flying to direct position:', vehicleIdOrPosition);
        setFlyToPositionWhenSelected(vehicleIdOrPosition);
        lastFlyEventRef.current = 'manual_direct_position';
      } else {
        // Vehicle ID - cari posisi real-time terlebih dahulu
        const vehicleId = vehicleIdOrPosition;
        const vehicle = updatedVehicles.find(v => v.vehicle_id === vehicleId);
        
        if (vehicle && vehicle.position) {
          const position = [vehicle.position.lat, vehicle.position.lng];
          console.log(`🎯 Flying to real-time position for ${vehicle.name}:`, position);
          setFlyToPositionWhenSelected(position);
          lastFlyEventRef.current = 'manual_api_call_realtime';
        } else {
          console.warn(`⚠️ Vehicle ${vehicleId} not found or has no position`);
        }
      }
    }
  }), [updatedVehicles]);

  // ENHANCED: Handle selectedVehicle changes dengan posisi real-time
  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }
    
    const isNewVehicleSelected = selectedVehicle.vehicle_id !== selectedVehicleId;
    
    if (isNewVehicleSelected) {
      setSelectedVehicleId(selectedVehicle.vehicle_id);
      
      // FIXED: Selalu fly ke kendaraan yang dipilih (karena sekarang tidak ada auto-selection di dashboard)
      const realtimeVehicle = updatedVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
      
      if (realtimeVehicle && realtimeVehicle.position) {
        const position = [realtimeVehicle.position.lat, realtimeVehicle.position.lng];
        setFlyToPositionWhenSelected(position);
        lastFlyEventRef.current = 'sidebar_selection_realtime';
      } else if (selectedVehicle.position) {
        // Fallback ke posisi dari selectedVehicle jika tidak ada real-time
        const fallbackPosition = [selectedVehicle.position.lat, selectedVehicle.position.lng];
        setFlyToPositionWhenSelected(fallbackPosition);
        lastFlyEventRef.current = 'sidebar_selection_fallback';
      } else {
        setFlyToPositionWhenSelected(null);
      }
    }
  }, [selectedVehicle, selectedVehicleId, updatedVehicles]);
  
  useEffect(() => {
    mapReadyRef.current = true;
  }, []);

  const handlePolygonComplete = (coordinates) => {
    if (onPolygonComplete) {
      onPolygonComplete(coordinates);
    }
  };

  // Geofence deletion handlers (menggunakan kode asli Anda)
  const handleDeleteGeofence = async (geofenceId) => {
    if (!geofenceId) {
      console.error('ID Geofence tidak valid');
      return;
    }

    const geofence = allGeofences.find(g => g.geofence_id === geofenceId);
    setGeofenceToDelete(geofence);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setGeofenceToDelete(null);
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
  };

  const handleConfirmDelete = async () => {
    if (!geofenceToDelete) return;

    try {
      const response = await fetch(`/api/HapusGeofence?geofence_id=${geofenceToDelete.geofence_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus geofence');
      }

      const data = await response.json();

      if (data.success) {
        if (onGeofenceDeleted) {
          onGeofenceDeleted(geofenceToDelete.geofence_id);
        }
        
        setShowDeleteConfirm(false);
        showSuccessMessage(`Geofence "${geofenceToDelete.name}" berhasil dihapus`);
        setGeofenceToDelete(null);
      } else {
        throw new Error(data.message || 'Gagal menghapus geofence');
      }
    } catch (error) {
      console.error('Error deleting geofence:', error);
      console.error(`Gagal menghapus geofence: ${error.message}`);
    }
  };

  return (
    <>
      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={5}
        style={{ 
          width: "100%", 
          height: "100vh",
          position: "relative",
          zIndex: isDrawingMode ? 1 : 0
        }}
        className={`map-container leaflet-container ${isDrawingMode ? 'drawing-mode' : ''}`}
        dragging={!isDrawingMode}
        scrollWheelZoom={!isDrawingMode}
        doubleClickZoom={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {flyToPositionWhenSelected && (
          <FlyToPosition position={flyToPositionWhenSelected} />
        )}

        <DrawingHandler 
          isDrawingMode={isDrawingMode}
          drawingType={drawingType}
          onPolygonComplete={handlePolygonComplete}
        />

        {/* ENHANCED: Vehicle markers dengan AnimatedMarker untuk smooth movement */}
        {!isDrawingMode && updatedVehicles.map((vehicle) => {
          let geofenceStatus = null;
          if (vehicle.geofence_id) {
            const vehicleGeofence = allGeofences.find(g => g.geofence_id === vehicle.geofence_id);
            if (vehicleGeofence) {
              geofenceStatus = getGeofenceStatus(vehicle, [vehicleGeofence]);
            }
          }

          // Check if GPS is online based on last update timestamp
          const isGpsOnline = vehicle.position && vehicle.position.timestamp && 
            (new Date() - new Date(vehicle.position.timestamp)) < 5 * 60 * 1000; // 5 minutes threshold
        
          return vehicle.position ? (
            <AnimatedMarker
              key={`vehicle-${vehicle.vehicle_id}-${vehicle.position.updateId || vehicle.position.timestamp}`}
              position={[vehicle.position.lat, vehicle.position.lng]}
              icon={vehicleIcon}
              duration={1000} // Smooth animation duration
            >
              <Popup maxWidth={200}>
                <div className="p-1.5 font-sans">
                  <h3 className="font-bold text-sm mb-2 text-blue-700 border-b border-gray-200 pb-1 text-center">
                    {vehicle.name}
                  </h3>
                
                  <div className="text-xs leading-relaxed">
                    {/* Basic Info */}
                    <div className="mb-2">
                      <div className="flex justify-between mb-1">
                        <div className="flex-1 mr-2">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Plat Nomor</div>
                          <div className="font-semibold text-gray-700 text-xs">{vehicle.license_plate}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">GPS ID</div>
                          <div className="font-semibold text-gray-700 text-xs">{vehicle.gps_id}</div>
                        </div>
                      </div>
                    </div>
                  
                    {/* Location & Vehicle ID */}
                    <div className="mb-2">
                      <div className="flex justify-between mb-1">
                        <div className="flex-1 mr-2">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Lokasi</div>
                          <div className="text-xs">
                            <div className="mb-0.5">
                              <span className="text-gray-500">Lat: </span>
                              <span className="font-semibold text-gray-700">{vehicle.position.lat.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Lng: </span>
                              <span className="font-semibold text-gray-700">{vehicle.position.lng.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Vehicle ID</div>
                          <div className="font-semibold text-gray-700 text-xs">{vehicle.vehicle_id}</div>
                        </div>
                      </div>
                    </div>

                    {/* ENHANCED: Real-time vehicle data */}
                    <div className="mb-2">
                      <div className="bg-blue-50 p-1.5 rounded-md">
                        <div className="font-semibold text-gray-700 mb-1 text-xs">Data Real-time</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>
                            <span className="text-gray-500">Kecepatan:</span>
                            <div className="font-semibold text-blue-600">
                              {vehicle.position.speed || 0} km/h
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Status GPS:</span>
                            <div className={`font-semibold ${isGpsOnline ? 'text-green-600' : 'text-red-600'}`}>
                              {isGpsOnline ? 'ONLINE' : 'OFFLINE'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <div className={`font-semibold ${
                              (vehicle.position.speed || 0) > 0 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {(vehicle.position.speed || 0) > 0 ? 'BERGERAK' : 'PARKIR'}
                            </div>
                          </div>
                          {vehicle.position.ignition_status && (
                            <div>
                              <span className="text-gray-500">Mesin:</span>
                              <div className={`font-semibold ${
                                vehicle.position.ignition_status === 'ON' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {vehicle.position.ignition_status}
                              </div>
                            </div>
                          )}
                          {vehicle.position.battery_level && (
                            <div>
                              <span className="text-gray-500">Baterai:</span>
                              <div className="font-semibold text-green-600">
                                {parseFloat(vehicle.position.battery_level).toFixed(1)}V
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  
                    {/* Geofence Status */}
                    <div className="bg-gray-50 p-1.5 rounded-md mb-2">
                      <div className="font-semibold text-gray-700 mb-1 text-xs">Status Geofence</div>
                      {geofenceStatus ? (
                        <div className={`px-1.5 py-1 rounded ${
                          geofenceStatus.inside 
                            ? 'border-l-4 border-green-500 bg-green-100' 
                            : 'border-l-4 border-red-500 bg-red-100'
                        }`}>
                          <div className={`text-xs font-medium ${
                            geofenceStatus.inside ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {geofenceStatus.inside 
                              ? `Dalam area: ${geofenceStatus.name}`
                              : geofenceStatus.name 
                                ? `Di luar area: ${geofenceStatus.name} (${(geofenceStatus.distance/1000).toFixed(2)} km)`
                                : 'Di luar semua area'
                            }
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">Tidak ada geofence</div>
                      )}
                    </div>
                  
                    {/* ENHANCED: Timestamp */}
                    <div className="border-t border-gray-200 pt-1 text-center">
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold">Update Terakhir:</span><br/>
                        {new Date(vehicle.position.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </AnimatedMarker>
          ) : null;
        })}

        {/* Vehicle path/history - tidak berubah dari asli */}
        {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (
          <HistoryPath path={selectedVehicle.path} />
        )}

        {/* Geofences rendering - menggunakan kode asli Anda */}
        {!isDrawingMode && geofences.map((geofence) => {
          try {
            const geoData = typeof geofence.definition === 'string' 
              ? JSON.parse(geofence.definition) 
              : geofence.definition;
            
            if (geoData && geoData.coordinates) {
              const originalType = geofence.type;
              
              if (originalType === 'circle') {
                const coords = geoData.coordinates[0].map(coord => [coord[1], coord[0]]);
                
                return (
                  <Polygon
                    key={`geofence-${geofence.geofence_id || geofence.id}`}
                    positions={coords}
                    color={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillColor={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillOpacity={0.1}
                    weight={2}
                    opacity={0.8}
                  >
                    <Popup maxWidth={300}>
                      <div className="p-2 font-sans">
                        <h3 className="font-bold text-lg mb-3 text-blue-700 border-b border-gray-200 pb-2 text-center">
                          {geofence.name}
                        </h3>
                        
                        <div className="text-sm leading-relaxed">
                          <div className="mb-3">
                            <div className="text-center mb-2">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  geofence.rule_type === 'FORBIDDEN' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-2 text-center">
                              <span className="font-medium">Bentuk:</span> Circle
                            </div>
                          </div>

                          <div className="bg-blue-50 p-2.5 rounded-md mb-3">
                            <div className="font-semibold text-gray-700 mb-1.5">Kendaraan Terkait</div>
                            {(() => {
                              const vehicleUsingThisGeofence = vehicles.find(v => v.geofence_id === geofence.geofence_id);
                              return vehicleUsingThisGeofence ? (
                                <div className="p-2 bg-white rounded border border-gray-200">
                                  <div className="font-semibold text-xs text-blue-700 mb-0.5">
                                    {vehicleUsingThisGeofence.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {vehicleUsingThisGeofence.license_plate} • {vehicleUsingThisGeofence.make} {vehicleUsingThisGeofence.model}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
                                  <div className="text-xs text-gray-500 italic">
                                    Tidak dikaitkan dengan kendaraan
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {geofence.date_created && (
                            <div className="border-t border-gray-200 pt-2 mb-3 text-center">
                              <div className="text-xs text-gray-500">
                                <span className="font-semibold">Dibuat:</span><br/>
                                {new Date(geofence.date_created).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-gray-200 pt-3 text-center">
                            <button
                              onClick={() => handleDeleteGeofence(geofence.geofence_id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-w-[120px]"
                            >
                              Hapus Geofence
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
              else if (geoData.type === 'Polygon') {
                const coords = geoData.coordinates[0].map(coord => [coord[1], coord[0]]);
                
                return (
                  <Polygon
                    key={`geofence-${geofence.geofence_id || geofence.id}`}
                    positions={coords}
                    color={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillColor={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillOpacity={0.1}
                    weight={2}
                    opacity={0.8}
                  >
                    <Popup maxWidth={220}>
                      <div className="p-1.5 font-sans">
                        <h3 className="font-bold text-sm mb-2 text-blue-700 border-b border-gray-200 pb-1 text-center">
                          {geofence.name}
                        </h3>
                        
                        <div className="text-xs leading-relaxed">
                          <div className="mb-2">
                            <div className="text-center mb-1">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                  geofence.rule_type === 'FORBIDDEN' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1 text-center">
                              <span className="font-medium">Bentuk:</span> Polygon
                            </div>
                          </div>

                          <div className="bg-blue-50 p-1.5 rounded-md mb-2">
                            <div className="font-semibold text-gray-700 mb-1 text-xs">Kendaraan Terkait</div>
                            {(() => {
                              const vehicleUsingThisGeofence = vehicles.find(v => v.geofence_id === geofence.geofence_id);
                              return vehicleUsingThisGeofence ? (
                                <div className="p-1.5 bg-white rounded border border-gray-200">
                                  <div className="font-semibold text-xs text-blue-700 mb-0.5">
                                    {vehicleUsingThisGeofence.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {vehicleUsingThisGeofence.license_plate} • {vehicleUsingThisGeofence.make} {vehicleUsingThisGeofence.model}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-1.5 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
                                  <div className="text-xs text-gray-500 italic">
                                    Tidak dikaitkan dengan kendaraan
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {geofence.date_created && (
                            <div className="border-t border-gray-200 pt-1 mb-2 text-center">
                              <div className="text-xs text-gray-500">
                                <span className="font-semibold">Dibuat:</span><br/>
                                {new Date(geofence.date_created).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-gray-200 pt-2 text-center">
                            <button
                              onClick={() => handleDeleteGeofence(geofence.geofence_id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-w-[100px]"
                            >
                              Hapus Geofence
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              } else if (geoData.type === 'Circle') {
                const center = [geoData.coordinates.center[1], geoData.coordinates.center[0]];
                const radius = geoData.coordinates.radius;
                
                return (
                  <Circle
                    key={`geofence-${geofence.geofence_id || geofence.id}`}
                    center={center}
                    radius={radius}
                    color={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillColor={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
                    fillOpacity={0.1}
                    weight={2}
                    opacity={0.8}
                  >
                    <Popup maxWidth={220}>
                      <div className="p-1.5 font-sans">
                        <h3 className="font-bold text-sm mb-2 text-blue-700 border-b border-gray-200 pb-1 text-center">
                          {geofence.name}
                        </h3>
                        
                        <div className="text-xs leading-relaxed">
                          <div className="mb-2">
                            <div className="text-center mb-1">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                  geofence.rule_type === 'FORBIDDEN' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1 text-center">
                              <span className="font-medium">Radius:</span> {Math.round(radius)}m
                            </div>
                          </div>

                          <div className="bg-blue-50 p-1.5 rounded-md mb-2">
                            <div className="font-semibold text-gray-700 mb-1 text-xs">Kendaraan Terkait</div>
                            {(() => {
                              const vehicleUsingThisGeofence = vehicles.find(v => v.geofence_id === geofence.geofence_id);
                              return vehicleUsingThisGeofence ? (
                                <div className="p-1.5 bg-white rounded border border-gray-200">
                                  <div className="font-semibold text-xs text-blue-700 mb-0.5">
                                    {vehicleUsingThisGeofence.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {vehicleUsingThisGeofence.license_plate} • {vehicleUsingThisGeofence.make} {vehicleUsingThisGeofence.model}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-1.5 bg-gray-50 rounded border border-dashed border-gray-300 text-center">
                                  <div className="text-xs text-gray-500 italic">
                                    Tidak dikaitkan dengan kendaraan
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {geofence.date_created && (
                            <div className="border-t border-gray-200 pt-1 mb-2 text-center">
                              <div className="text-xs text-gray-500">
                                <span className="font-semibold">Dibuat:</span><br/>
                                {new Date(geofence.date_created).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-gray-200 pt-2 text-center">
                            <button
                              onClick={() => handleDeleteGeofence(geofence.geofence_id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-w-[100px]"
                            >
                              Hapus Geofence
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                );
              }
            }
            
            return null;
          } catch {
            return null;
          }
        })}

        {/* Drawing mode indicator - menggunakan styling asli */}
        {isDrawingMode && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs z-[9999] shadow-md">
            <span className="flex items-center">
              Mode Drawing Aktif ({drawingType === "circle" ? "Circle" : "Polygon"}) - 
              {drawingType === "polygon" 
                ? " klik kiri untuk titik, klik kanan untuk selesai (min 3 titik)"
                : " klik kiri untuk center, klik kiri kedua untuk menentukan radius"
              }
            </span>
          </div>
        )}
      </MapContainer>

      {/* Modal konfirmasi hapus geofence - menggunakan styling asli */}
      {showDeleteConfirm && geofenceToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded-lg shadow-2xl max-w-xs w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 text-red-500 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold mb-3 text-gray-800">Konfirmasi Hapus Geofence</h3>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2 text-sm">
                  Apakah Anda yakin ingin menghapus geofence:
                </p>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="font-semibold text-gray-800 text-sm">{geofenceToDelete.name}</p>
                  <p className="text-xs text-gray-600">Tipe: {geofenceToDelete.rule_type}</p>
                  <p className="text-xs text-gray-600">Status: {geofenceToDelete.status}</p>
                </div>
                <p className="text-red-600 text-xs mt-2 font-medium">
                  Geofence yang dihapus tidak dapat dikembalikan
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
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium text-sm"
                >
                  Ya, Hapus Geofence
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal notifikasi sukses - menggunakan styling asli */}
      {showSuccessNotification && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-3 rounded-md shadow-lg max-w-xs">
            <h3 className="text-base font-bold mb-2 text-green-600 text-center">Berhasil Menghapus Geofence!</h3>
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
    </>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;