// components/MapComponent.js - Versi yang ditingkatkan dengan SWR dan pencocokan gps_id yang benar
import { MapContainer, TileLayer, Popup, Polyline, Polygon, Circle, useMap, useMapEvents, CircleMarker } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from "react";
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import L from "leaflet";
import { getGeofenceStatus } from "@/utils/geofenceUtils";
import { createPortal } from 'react-dom';
import AnimatedMarker from './AnimatedMarker';
import HistoryPath from './HistoryPath';

// Ikon kendaraan
const vehicleIcon = new L.Icon({
  iconUrl: "/icon/logo_mobil.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Ikon titik polygon
const polygonPointIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#ff0000" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Komponen FlyToPosition
const FlyToPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      // console.log("FlyToPosition: Flying to position:", position); // Log debugging dihapus
      map.flyTo(position, 16);
    }
  }, [position, map]);

  return null;
};

// Komponen DrawingHandler yang mendukung polygon dan circle
const DrawingHandler = forwardRef(({ isDrawingMode, drawingType, onPolygonComplete }) => {
  const map = useMap();
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [circleCenter, setCircleCenter] = useState(null);
  
  // Gunakan refs untuk melacak temporary layers secara langsung
  const tempMarkersRef = useRef([]);
  const tempPolylineRef = useRef(null);
  const tempCircleRef = useRef(null);

  // Fungsi untuk membersihkan semua temporary elements
  const clearTemporaryElements = useCallback(() => {
    // Clear markers
    tempMarkersRef.current.forEach(marker => {
      try {
        if (marker && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (error) {
        console.warn('Error removing marker:', error);
      }
    });
    tempMarkersRef.current = [];
    
    // Clear polyline
    if (tempPolylineRef.current) {
      try {
        if (map.hasLayer(tempPolylineRef.current)) {
          map.removeLayer(tempPolylineRef.current);
        }
      } catch (error) {
        console.warn('Error removing polyline:', error);
      }
      tempPolylineRef.current = null;
    }
    
    // Clear circle
    if (tempCircleRef.current) {
      try {
        if (map.hasLayer(tempCircleRef.current)) {
          map.removeLayer(tempCircleRef.current);
        }
      } catch (error) {
        console.warn('Error removing circle:', error);
      }
      tempCircleRef.current = null;
    }
    
    setCurrentPolygon([]);
    setIsDrawing(false);
    setCircleCenter(null);
  }, [map]);

  useMapEvents({
    click: (e) => {
      if (!isDrawingMode) return;
      
      if (drawingType === "polygon") {
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPolygon = [...currentPolygon, newPoint];
      
      setCurrentPolygon(newPolygon);
      setIsDrawing(true);
      
      // Tambahkan marker untuk titik
      const marker = L.marker(e.latlng, {
        icon: polygonPointIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
        tempMarkersRef.current.push(marker);
      
      // Buat polyline visual
      if (newPolygon.length > 1) {
          if (tempPolylineRef.current) {
            map.removeLayer(tempPolylineRef.current);
        }
        
        const polyline = L.polyline(newPolygon, {
          color: 'red',
          weight: 2,
          dashArray: '5, 5'
        }).addTo(map);
        
          tempPolylineRef.current = polyline;
        }
      } else if (drawingType === "circle") {
        if (!isDrawing) {
          // Klik pertama: Set center point
          setCircleCenter(e.latlng);
          setIsDrawing(true);
          
          // Add center marker
          const marker = L.marker(e.latlng, {
            icon: polygonPointIcon,
            zIndexOffset: 1000
          }).addTo(map);
          
          tempMarkersRef.current = [marker];
        } else if (circleCenter) {
          // Klik kedua: Set radius dan selesaikan circle
          const radius = circleCenter.distanceTo(e.latlng);
          
          if (radius >= 10) { // Minimum radius 10 meters
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
      if (!isDrawingMode) return;
      
      if (drawingType === "polygon" && currentPolygon.length >= 3) {
        // Mode polygon - selesaikan menggambar
        onPolygonComplete(currentPolygon);
        clearTemporaryElements();
      }
      // Untuk circle, tidak ada aksi pada context menu (klik kanan)
    },
    
    mousemove: (e) => {
      if (!isDrawingMode || drawingType !== "circle" || !isDrawing || !circleCenter) return;
      
      const radius = circleCenter.distanceTo(e.latlng);
      
      // Minimum radius 10 meters
      if (radius < 10) return;
      
      // Clear existing temporary circle
      if (tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch (error) {
          console.warn('Error removing temp circle in mousemove:', error);
        }
        tempCircleRef.current = null;
      }
      
      // Create new temporary circle
      try {
        const circle = L.circle(circleCenter, {
          radius: radius,
          color: 'red',
          fillColor: 'red',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(map);
        
        tempCircleRef.current = circle;
      } catch (error) {
        console.warn('Error creating temp circle:', error);
      }
    },
    
    // Tambahkan event handler untuk membersihkan temporary elements saat map mulai digeser
    movestart: () => {
      if (isDrawingMode) {
        // Bersihkan temporary circle saat map mulai digeser
        if (tempCircleRef.current) {
          try {
            if (map.hasLayer(tempCircleRef.current)) {
              map.removeLayer(tempCircleRef.current);
            }
          } catch (error) {
            console.warn('Error removing temp circle in movestart:', error);
          }
          tempCircleRef.current = null;
        }
      }
    },
    
    // Event handler saat map selesai digeser
    moveend: () => {
      // Tidak perlu action khusus, temporary elements sudah dibersihkan di movestart
    },
    
    // Event handler untuk zoom
    zoomstart: () => {
      if (isDrawingMode) {
        // Bersihkan temporary circle saat zoom mulai
        if (tempCircleRef.current) {
          try {
            if (map.hasLayer(tempCircleRef.current)) {
              map.removeLayer(tempCircleRef.current);
            }
          } catch (error) {
            console.warn('Error removing temp circle in zoomstart:', error);
          }
          tempCircleRef.current = null;
        }
      }
    },
    
    // Event handler untuk ESC key atau cancel drawing
    keydown: (e) => {
      if (e.originalEvent.key === 'Escape' && isDrawingMode && isDrawing) {
        // Cancel current drawing
        clearTemporaryElements();
      }
    },
    
    // Additional event handlers untuk mengatasi masalah drag/pan
    dragstart: () => {
      if (isDrawingMode && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch (error) {
          console.warn('Error removing temp circle in dragstart:', error);
        }
        tempCircleRef.current = null;
      }
    },
    
    drag: () => {
      // Clear temporary circle during drag to prevent stuck circles
      if (isDrawingMode && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch (error) {
          console.warn('Error removing temp circle in drag:', error);
        }
        tempCircleRef.current = null;
      }
    },
    
    // Clear temporary circle when mouse leaves the map
    mouseout: () => {
      if (isDrawingMode && drawingType === "circle" && tempCircleRef.current) {
        try {
          if (map.hasLayer(tempCircleRef.current)) {
            map.removeLayer(tempCircleRef.current);
          }
        } catch (error) {
          console.warn('Error removing temp circle in mouseout:', error);
        }
        tempCircleRef.current = null;
      }
    }
  });

  // Bersihkan ketika mode menggambar berubah
  useEffect(() => {
    if (!isDrawingMode) {
      clearTemporaryElements();
    }
  }, [isDrawingMode, drawingType, clearTemporaryElements]);

  // Cleanup saat component unmount
  useEffect(() => {
    return () => {
      clearTemporaryElements();
    };
  }, [clearTemporaryElements]);

  // Aggressive cleanup untuk temporary circle yang stuck
  useEffect(() => {
    if (!isDrawingMode || drawingType !== "circle") {
      // Force cleanup all temporary circles when not in circle drawing mode
      clearTemporaryElements();
    }
  }, [isDrawingMode, drawingType, clearTemporaryElements]);

  // Periodic cleanup untuk memastikan tidak ada temporary circles yang stuck
  useEffect(() => {
    if (isDrawingMode && drawingType === "circle") {
      const cleanupInterval = setInterval(() => {
        // Hanya bersihkan jika tidak sedang aktif menggambar
        if (!isDrawing && tempCircleRef.current) {
          try {
            if (map.hasLayer(tempCircleRef.current)) {
              map.removeLayer(tempCircleRef.current);
            }
          } catch (error) {
            console.warn('Error in periodic cleanup:', error);
          }
          tempCircleRef.current = null;
        }
      }, 1000); // Check every second

      return () => clearInterval(cleanupInterval);
    }
  }, [isDrawingMode, drawingType, isDrawing, map]);

  return (
    <>
      {/* Render current polygon if it has at least 3 points */}
      {drawingType === "polygon" && isDrawing && currentPolygon.length >= 3 && (
        <Polygon 
          positions={currentPolygon} 
          color="red" 
          fillColor="red" 
          fillOpacity={0.2}
          weight={2}
          dashArray="5, 5"
        />
      )}
      

    </>
  );
});

DrawingHandler.displayName = 'DrawingHandler';

// Komponen peta utama
const MapComponent = forwardRef(({ 
  vehicles, 
  selectedVehicle, 
  isDrawingMode = false,
  drawingType = "polygon",
  onPolygonComplete,
  geofences = [],
  allGeofences = [],
  onGeofenceDeleted
}, ref) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [flyToPositionWhenSelected, setFlyToPositionWhenSelected] = useState(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(null);
  const [hasReceivedDataBefore, setHasReceivedDataBefore] = useState(false);
  
  // State untuk modal konfirmasi hapus geofence
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  
  // State untuk notifikasi sukses
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const lastFlyEventRef = useRef('');
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);

  // Gunakan WebSocket untuk real-time updates
  const { data: wsData, isConnected } = useWebSocket();

  // Monitor WebSocket connection status
  useEffect(() => {
    if (!isConnected) {
      console.warn("⚠️ WebSocket disconnected - vehicle positions may be stale");
    }
  }, [isConnected]);

  // Process and merge coordinate data with initial vehicles using gps_id
  const updatedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    // Always return vehicles with their current position
    let result = [...vehicles];

    // If we have fresh coordinate data from WebSocket, update the positions
    if (wsData && wsData.data && wsData.data.length > 0) {
      // Create coordinate updates map using gps_id
      const coordinateUpdates = {};
      wsData.data.forEach(coord => {
        // Use gps_id for matching instead of vehicle_id
        if (coord && coord.gps_id) {
          coordinateUpdates[coord.gps_id] = coord;
        }
      });

      // Update vehicles with new coordinates
      result = vehicles.map(vehicle => {
        // Match using gps_id field
        const update = coordinateUpdates[vehicle.gps_id];
        
        if (update) {
          const newLat = parseFloat(update.latitude);
          const newLng = parseFloat(update.longitude);
          
          if (!isNaN(newLat) && !isNaN(newLng)) {
            return {
              ...vehicle,
              position: {
                lat: newLat,
                lng: newLng,
                timestamp: update.timestamp
              }
            };
          }
        }
        
        // Return vehicle with existing position if no update
        return vehicle;
      });
    }
    
    return result;
  }, [vehicles, wsData]);

  // Initial map center
  const initialCenter = useMemo(() => {
    if (updatedVehicles.length > 0 && updatedVehicles[0].position) {
      return [updatedVehicles[0].position.lat, updatedVehicles[0].position.lng];
    }
    return [-6.914744, 107.609810];
  }, [updatedVehicles]);

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    flyToVehicle: (position) => {
      // console.log("Manual flyToVehicle called with position:", position); // Removed debugging log
      setFlyToPositionWhenSelected(position);
      lastFlyEventRef.current = 'manual_api_call';
    }
  }), []);

  // Handle selectedVehicle changes
  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }
    
    // console.log("selectedVehicle changed:", { // Removed debugging log
    //   vehicle_id: selectedVehicle.vehicle_id,
    //   prev: selectedVehicleId,
    //   hasPosition: !!selectedVehicle.position
    // });
    
    const isNewVehicleSelected = selectedVehicle.vehicle_id !== selectedVehicleId;
    
    if (isNewVehicleSelected && selectedVehicle.position) {
      // console.log("NEW VEHICLE SELECTED FROM SIDEBAR - flying to position"); // Removed debugging log
      
      setSelectedVehicleId(selectedVehicle.vehicle_id);
      setFlyToPositionWhenSelected([selectedVehicle.position.lat, selectedVehicle.position.lng]);
      
      lastFlyEventRef.current = 'sidebar_selection';
    } 
    else if (isNewVehicleSelected) {
      // console.log("Vehicle selected but has no position");
      setSelectedVehicleId(selectedVehicle.vehicle_id);
      setFlyToPositionWhenSelected(null);
    }
  }, [selectedVehicle, selectedVehicleId]);
  
  // Mark map as ready
  useEffect(() => {
    mapReadyRef.current = true;
    // console.log("Map ready");
  }, []);

  // Handle polygon completion
  const handlePolygonComplete = (coordinates) => {
    if (onPolygonComplete) {
      onPolygonComplete(coordinates);
    }
  };

  // Handle geofence deletion
  const handleDeleteGeofence = async (geofenceId) => {
    if (!geofenceId) {
      console.error('ID Geofence tidak valid');
      return;
    }

    // Set geofence to delete and show modal
    const geofence = allGeofences.find(g => g.geofence_id === geofenceId);
    setGeofenceToDelete(geofence);
    setShowDeleteConfirm(true);
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setGeofenceToDelete(null);
  };

  // Show success message
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
  };

  // Handle confirm delete
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
        // Panggil callback untuk refresh data di parent component
        if (onGeofenceDeleted) {
          onGeofenceDeleted(geofenceToDelete.geofence_id);
        }
        
        // Tutup modal konfirmasi
        setShowDeleteConfirm(false);
        
        // Tampilkan notifikasi sukses
        showSuccessMessage(`Geofence "${geofenceToDelete.name}" berhasil dihapus`);
        
        // Reset geofence to delete
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
      zoom={12}
      style={{ width: "100%", height: "100vh" }}
      className="map-container"
      dragging={!isDrawingMode}
      scrollWheelZoom={!isDrawingMode}
      doubleClickZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Fly to position when vehicle selected */}
      {flyToPositionWhenSelected && (
        <FlyToPosition position={flyToPositionWhenSelected} />
      )}

      <DrawingHandler 
        isDrawingMode={isDrawingMode}
          drawingType={drawingType}
        onPolygonComplete={handlePolygonComplete}
      />

      {/* Vehicles markers */}
      {!isDrawingMode && updatedVehicles.map((vehicle) => {
          
          // Get geofence status untuk kendaraan ini - hanya cek geofence yang terkait
          let geofenceStatus = null;
          if (vehicle.geofence_id) {
            // Cari geofence yang terkait dengan kendaraan ini
            const vehicleGeofence = allGeofences.find(g => g.geofence_id === vehicle.geofence_id);
            if (vehicleGeofence) {
              // Hanya cek status untuk geofence yang terkait dengan kendaraan ini
              geofenceStatus = getGeofenceStatus(vehicle, [vehicleGeofence]);
            }
          }
          // Jika vehicle.geofence_id null/undefined, geofenceStatus tetap null
        
        return vehicle.position ? (
            <AnimatedMarker
            key={`vehicle-${vehicle.vehicle_id}`}
            position={[vehicle.position.lat, vehicle.position.lng]}
            icon={vehicleIcon}
          >
            <Popup maxWidth={320}>
                <div className="p-2 font-sans">
                  <h3 className="font-bold text-lg mb-3 text-blue-700 border-b border-gray-200 pb-2 text-center">
                  {vehicle.name}
                </h3>
                
                  <div className="text-sm leading-relaxed">
                  {/* Basic Info */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1.5">
                        <div className="flex-1 mr-2.5">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Plat Nomor</div>
                          <div className="font-semibold text-gray-700">{vehicle.license_plate}</div>
                      </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">GPS ID</div>
                          <div className="font-semibold text-gray-700">{vehicle.gps_id}</div>
                      </div>
                    </div>
                  </div>
                  
                    {/* Location & Vehicle ID */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1.5">
                        <div className="flex-1 mr-2.5">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Lokasi</div>
                          <div className="text-xs">
                            <div className="mb-1">
                              <span className="text-gray-500">Lat: </span>
                              <span className="font-semibold text-gray-700">{vehicle.position.lat.toFixed(6)}</span>
                      </div>
                      <div>
                              <span className="text-gray-500">Lng: </span>
                              <span className="font-semibold text-gray-700">{vehicle.position.lng.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase mb-0.5">Vehicle ID</div>
                          <div className="font-semibold text-gray-700">{vehicle.vehicle_id}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Geofence Status */}
                    <div className="bg-gray-50 p-2.5 rounded-md mb-3">
                      <div className="font-semibold text-gray-700 mb-1.5">Status Geofence</div>
                    {geofenceStatus ? (
                        <div className={`px-2 py-1.5 rounded ${
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
                  
                  {/* Timestamp */}
                    <div className="border-t border-gray-200 pt-2 text-center">
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
        ) : (
          // console.log(`Vehicle ${vehicle.vehicle_id} has no position data`),
          null
        );
      })}

      {/* Vehicle path/history */}
        {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (
          <HistoryPath path={selectedVehicle.path} />
        )}

      {/* Geofences - hidden during drawing */}
      {!isDrawingMode && geofences.map((geofence) => {
        // console.log('MapComponent rendering geofence:', geofence);
        
        try {
          // Parse geofence definition
          const geoData = typeof geofence.definition === 'string' 
            ? JSON.parse(geofence.definition) 
            : geofence.definition;
          
          // console.log('Geofence geoData:', geoData);
          
          if (geoData && geoData.coordinates) {
              // Check the original type field to distinguish between polygon and circle
              const originalType = geofence.type; // This is the type we set (polygon/circle)
              
              if (originalType === 'circle') {
                // Circle stored as polygon - render as polygon but show circle info
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
                    <Popup maxWidth={380}>
                      <div className="p-2 font-sans">
                        <h3 className="font-bold text-lg mb-3 text-blue-700 border-b border-gray-200 pb-2 text-center">
                          {geofence.name}
                        </h3>
                        
                        <div className="text-sm leading-relaxed">
                          {/* Geofence Info */}
                          <div className="mb-3">
                            <div className="flex justify-between mb-2">
                              <div className="flex-1 mr-2.5">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  geofence.rule_type === 'FORBIDDEN' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Status</div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  geofence.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {geofence.status === 'active' ? 'AKTIF' : 'INACTIVE'}
                                </span>
                              </div>
                            </div>
                            {/* Circle specific info */}
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Bentuk:</span> Circle (Area Lingkaran)
                            </div>
                          </div>

                          {/* Associated Vehicle */}
                          <div className="bg-blue-50 p-2.5 rounded-md mb-3">
                            <div className="font-semibold text-gray-700 mb-1.5">Kendaraan Terkait</div>
                            {(() => {
                              // Cari vehicle yang menggunakan geofence ini
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

                          {/* Date Created */}
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

                          {/* Delete Button */}
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
                // Regular polygon
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
                <Popup maxWidth={380}>
                  <div className="p-2 font-sans">
                    <h3 className="font-bold text-lg mb-3 text-blue-700 border-b border-gray-200 pb-2 text-center">
                      {geofence.name}
                    </h3>
                    
                    <div className="text-sm leading-relaxed">
                      {/* Geofence Info */}
                      <div className="mb-3">
                        <div className="flex justify-between mb-2">
                          <div className="flex-1 mr-2.5">
                            <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              geofence.rule_type === 'FORBIDDEN' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase mb-0.5">Status</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              geofence.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {geofence.status === 'active' ? 'AKTIF' : 'INACTIVE'}
                            </span>
                          </div>
                        </div>
                        {/* Polygon specific info */}
                        <div className="text-xs text-gray-600 mt-2">
                          <span className="font-medium">Bentuk:</span> Polygon (Area Custom)
                        </div>
                      </div>

                      {/* Associated Vehicle */}
                      <div className="bg-blue-50 p-2.5 rounded-md mb-3">
                        <div className="font-semibold text-gray-700 mb-1.5">Kendaraan Terkait</div>
                  {(() => {
                    // Cari vehicle yang menggunakan geofence ini
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

                      {/* Date Created */}
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

                      {/* Delete Button */}
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
              } else if (geoData.type === 'Circle') {
                // Circle: render using Circle component
                const center = [geoData.coordinates.center[1], geoData.coordinates.center[0]]; // Convert [lng, lat] to [lat, lng]
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
                    <Popup maxWidth={380}>
                      <div className="p-2 font-sans">
                        <h3 className="font-bold text-lg mb-3 text-blue-700 border-b border-gray-200 pb-2 text-center">
                          {geofence.name}
                        </h3>
                        
                        <div className="text-sm leading-relaxed">
                          {/* Geofence Info */}
                          <div className="mb-3">
                            <div className="flex justify-between mb-2">
                              <div className="flex-1 mr-2.5">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Tipe</div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  geofence.rule_type === 'FORBIDDEN' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {geofence.rule_type === 'FORBIDDEN' ? 'TERLARANG' : 'STAY_IN'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 uppercase mb-0.5">Status</div>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  geofence.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {geofence.status === 'active' ? 'AKTIF' : 'INACTIVE'}
                                </span>
                              </div>
                            </div>
                            {/* Circle specific info */}
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Radius:</span> {Math.round(radius)}m
                            </div>
                          </div>

                          {/* Associated Vehicle */}
                          <div className="bg-blue-50 p-2.5 rounded-md mb-3">
                            <div className="font-semibold text-gray-700 mb-1.5">Kendaraan Terkait</div>
                            {(() => {
                              // Cari vehicle yang menggunakan geofence ini
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

                          {/* Date Created */}
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

                          {/* Delete Button */}
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
                  </Circle>
                );
              }
            }
            
            return null;
          } catch {
            // console.error('Error parsing geofence data:', error);
            return null;
          }
      })}

      {/* Drawing mode indicator */}
      {isDrawingMode && (
          <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-5 py-2.5 rounded z-[1000] shadow-md">
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

      {/* Modal konfirmasi hapus geofence */}
      {showDeleteConfirm && geofenceToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 text-red-500 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-16 h-16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi Hapus Geofence</h3>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Apakah Anda yakin ingin menghapus geofence:
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-semibold text-gray-800">{geofenceToDelete.name}</p>
                  <p className="text-sm text-gray-600">Tipe: {geofenceToDelete.rule_type}</p>
                  <p className="text-sm text-gray-600">Status: {geofenceToDelete.status}</p>
                </div>
                <p className="text-red-600 text-sm mt-3 font-medium">
                  Geofence yang dihapus tidak dapat dikembalikan
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
                  onClick={handleConfirmDelete}
                  className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-medium"
                >
                  Ya, Hapus Geofence
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
            <h3 className="text-lg font-bold mb-4 text-green-600 text-center">Berhasil Menghapus Geofence!</h3>
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
    </>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;