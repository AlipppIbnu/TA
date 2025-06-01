// components/MapComponent.js - Enhanced version with SWR and correct gps_id matching
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import useSWR from 'swr';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import L from "leaflet";
import { getGeofenceStatus } from "@/utils/geofenceUtils";

// Vehicle icon
const vehicleIcon = new L.Icon({
  iconUrl: "/icon/logo_mobil.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Polygon point icon
const polygonPointIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#ff0000" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// SWR Fetcher function
const fetcher = async (url) => {
  // console.log("Fetching from:", url); // Removed debugging log
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// SWR Fetcher function for vehicle data
const vehicleDataFetcher = async (url) => {
  // console.log("Fetching vehicle data from:", url); // Removed debugging log
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }
    
    return data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// FlyToPosition component
const FlyToPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      // console.log("FlyToPosition: Flying to position:", position); // Removed debugging log
      map.flyTo(position, 16);
    }
  }, [position, map]);

  return null;
};

// Enhanced DrawingHandler component dengan multipolygon support
const DrawingHandler = forwardRef(({ isDrawingMode, onPolygonComplete, isMultiPolygon = false }, ref) => {
  const map = useMap();
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempMarkers, setTempMarkers] = useState([]);
  const [tempPolyline, setTempPolyline] = useState(null);

  useMapEvents({
    click: (e) => {
      if (!isDrawingMode) return;
      
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPolygon = [...currentPolygon, newPoint];
      
      setCurrentPolygon(newPolygon);
      setIsDrawing(true);
      
      // Add marker for the point
      const marker = L.marker(e.latlng, {
        icon: polygonPointIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
      setTempMarkers(prev => [...prev, marker]);
      
      // Create visual polyline
      if (newPolygon.length > 1) {
        if (tempPolyline) {
          map.removeLayer(tempPolyline);
        }
        
        const polyline = L.polyline(newPolygon, {
          color: 'red',
          weight: 2,
          dashArray: '5, 5'
        }).addTo(map);
        
        setTempPolyline(polyline);
      }
    },
    
    contextmenu: (e) => {
      if (!isDrawingMode || currentPolygon.length < 3) return;
      
      if (isMultiPolygon) {
        // Add current polygon to the list of polygons
        setPolygons(prev => [...prev, currentPolygon]);
        
        // Clear current polygon but keep drawing mode active
        setCurrentPolygon([]);
        
        // Clear temporary markers and polyline
        tempMarkers.forEach(marker => map.removeLayer(marker));
        setTempMarkers([]);
        
        if (tempPolyline) {
          map.removeLayer(tempPolyline);
          setTempPolyline(null);
        }
        
        // Alert user
        alert('Polygon added! Right-click on the map to add another polygon, or click "Finish" to complete the multipolygon.');
      } else {
        // Single polygon mode - complete the drawing
        onPolygonComplete(currentPolygon);
        setCurrentPolygon([]);
        setIsDrawing(false);
        
        tempMarkers.forEach(marker => map.removeLayer(marker));
        setTempMarkers([]);
        
        if (tempPolyline) {
          map.removeLayer(tempPolyline);
          setTempPolyline(null);
        }
      }
    }
  });

  // Function to complete the multipolygon drawing
  const finishMultiPolygon = () => {
    let allPolygons = [...polygons];
    
    // Add the current polygon if it's valid
    if (currentPolygon.length >= 3) {
      allPolygons = [...polygons, currentPolygon];
    }
    
    if (allPolygons.length > 0) {
      // Send all polygons to the parent component
      onPolygonComplete(allPolygons);
      
      // Reset states
      setPolygons([]);
      setCurrentPolygon([]);
      setIsDrawing(false);
      
      // Clean up map
      tempMarkers.forEach(marker => map.removeLayer(marker));
      setTempMarkers([]);
      
      if (tempPolyline) {
        map.removeLayer(tempPolyline);
        setTempPolyline(null);
      }
    }
  };

  // Expose the finish function to parent component
  useImperativeHandle(ref, () => ({
    finishMultiPolygon
  }));

  // Clean up when drawing mode changes
  useEffect(() => {
    if (!isDrawingMode) {
      setCurrentPolygon([]);
      setPolygons([]);
      setIsDrawing(false);
      tempMarkers.forEach(marker => map.removeLayer(marker));
      setTempMarkers([]);
      if (tempPolyline) {
        map.removeLayer(tempPolyline);
        setTempPolyline(null);
      }
    }
  }, [isDrawingMode, map, tempMarkers, tempPolyline]);

  return (
    <>
      {/* Render all completed polygons */}
      {polygons.map((polygon, index) => (
        <Polygon 
          key={`polygon-${index}`}
          positions={polygon} 
          color="purple" 
          fillColor="purple" 
          fillOpacity={0.2}
          weight={2}
        />
      ))}
      
      {/* Render current polygon if it has at least 3 points */}
      {isDrawing && currentPolygon.length >= 3 && (
        <Polygon 
          positions={currentPolygon} 
          color="red" 
          fillColor="red" 
          fillOpacity={0.2}
          weight={2}
          dashArray="5, 5"
        />
      )}
      
      {/* UI for multipolygon mode */}
      {isDrawingMode && isMultiPolygon && (
        <div className="absolute top-20 right-4 bg-white p-4 rounded shadow-md z-50">
          <p className="text-sm font-bold mb-2">Multipolygon Drawing</p>
          <p className="text-xs mb-1">Polygons: {polygons.length}</p>
          <p className="text-xs mb-2">Current points: {currentPolygon.length}</p>
          <button 
            onClick={finishMultiPolygon}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded"
            disabled={polygons.length === 0 && currentPolygon.length < 3}
          >
            Finish Drawing
          </button>
        </div>
      )}
    </>
  );
});

DrawingHandler.displayName = 'DrawingHandler';

// Main map component
const MapComponent = forwardRef(({ 
  vehicles, 
  selectedVehicle, 
  isDrawingMode = false,
  isMultiPolygon = false,
  onPolygonComplete,
  geofences = []
}, ref) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [flyToPositionWhenSelected, setFlyToPositionWhenSelected] = useState(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(null);
  const [hasReceivedDataBefore, setHasReceivedDataBefore] = useState(false);
  
  const lastFlyEventRef = useRef('');
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const drawingHandlerRef = useRef(null);

  // SWR para real-time vehicle data (speed, rpm, etc.)
  const { 
    data: vehicleData, 
    error: vehicleDataError, 
    isLoading: vehicleDataLoading
  } = useSWR(
    'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055/items/vehicle_datas',
    vehicleDataFetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // SWR untuk real-time vehicle coordinates
  const swrKey = useMemo(() => {
    // Don't use 'since' parameter on first load to ensure we get data
    let url = "/api/KoordinatKendaraan?last_only=true";
    
    // Only add 'since' parameter if we have received data before
    // This ensures first request always gets data
    if (lastFetchTimestamp && hasReceivedDataBefore) {
      url += `&since=${encodeURIComponent(lastFetchTimestamp)}`;
    }
    
    console.log("SWR Key URL:", url); // Re-enabled debugging log
    return url;
  }, [lastFetchTimestamp, hasReceivedDataBefore]);

  const { 
    data: coordinateData, 
    error, 
    isLoading
  } = useSWR(
    swrKey,
    fetcher,
    {
      refreshInterval: 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 500,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onSuccess: (data) => {
        console.log("SWR Success - Coordinate data received:", data); // Re-enabled debugging log
        if (data && data.timestamp) {
          setLastFetchTimestamp(data.timestamp);
        }
        // Mark that we've received data before
        setHasReceivedDataBefore(true);
        
        // Always log the data we receive
        if (data && data.data) {
          console.log("SWR received coordinates:", data.data.length, "items");
          data.data.forEach(coord => {
            console.log("Coordinate item:", coord);
          });
        }
      },
      onError: (error) => {
        console.error("SWR Error:", error);
      }
    }
  );

  // WebSocket untuk real-time coordinate updates
  const { 
    data: wsCoordinateData, 
    ws: websocket,
    mutate: wsUpdate
  } = useWebSocket('/items/vehicle_datas');

  // Monitor WebSocket connection status
  useEffect(() => {
    if (websocket) {
      console.log("🟢 WebSocket connected for real-time coordinates");
      console.log("WebSocket readyState:", websocket.readyState);
    }
  }, [websocket]);

  // Monitor WebSocket data changes
  useEffect(() => {
    if (wsCoordinateData) {
      console.log("🔄 WebSocket real-time coordinate update:", wsCoordinateData);
      // Update timestamp when we get WebSocket data
      setLastFetchTimestamp(new Date().toISOString());
      setHasReceivedDataBefore(true);
    }
  }, [wsCoordinateData]);

  // Combine SWR and WebSocket data - prioritize WebSocket for real-time
  const realTimeCoordinateData = useMemo(() => {
    if (wsCoordinateData && wsCoordinateData.data) {
      console.log("🚀 Using WebSocket data for real-time updates");
      return wsCoordinateData;
    }
    console.log("📡 Using SWR data for coordinates");
    return coordinateData;
  }, [wsCoordinateData, coordinateData]);

  // Monitor WebSocket health and fallback to faster SWR polling if needed
  useEffect(() => {
    // If WebSocket is not connected after 10 seconds, increase SWR refresh rate
    const wsHealthCheck = setTimeout(() => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ WebSocket not connected, increasing SWR polling frequency");
        // The SWR config will handle this automatically
      }
    }, 10000);

    return () => clearTimeout(wsHealthCheck);
  }, [websocket]);

  // Process and merge coordinate data with initial vehicles using gps_id
  const updatedVehicles = useMemo(() => {
    console.log("=== PROCESSING VEHICLES DATA ==="); // Re-enabled debugging log
    console.log("Initial vehicles:", vehicles.map(v => ({  // Re-enabled debugging log
      vehicle_id: v.vehicle_id, 
      name: v.name, 
      gps_id: v.gps_id,
      hasInitialPosition: !!v.position 
    })));
    
    if (!vehicles || vehicles.length === 0) {
      console.log("No vehicles available"); // Re-enabled debugging log
      return [];
    }

    // Always return vehicles with their current position, whether from initial load or SWR
    let result = [...vehicles];

    // If we have fresh coordinate data from SWR, update the positions
    if (realTimeCoordinateData && realTimeCoordinateData.data && realTimeCoordinateData.data.length > 0) {
      console.log("Coordinate data from SWR:", realTimeCoordinateData.data); // Re-enabled debugging log

      // Create coordinate updates map using gps_id
      const coordinateUpdates = {};
      realTimeCoordinateData.data.forEach(coord => {
        console.log("Processing coordinate:", coord); // Re-enabled debugging log
        // Use gps_id for matching instead of vehicle_id
        if (coord && coord.gps_id) {
          coordinateUpdates[coord.gps_id] = coord;
          console.log(`Mapped coordinate for gps_id ${coord.gps_id}:`, coord); // Re-enabled debugging log
        }
      });

      console.log("Coordinate updates map:", coordinateUpdates); // Re-enabled debugging log

      // Update vehicles with new coordinates from SWR
      result = vehicles.map(vehicle => {
        // Match using gps_id field
        const update = coordinateUpdates[vehicle.gps_id];
        
        console.log(`Checking vehicle ${vehicle.vehicle_id} (gps_id: ${vehicle.gps_id}) for updates:`, !!update); // Re-enabled debugging log
        
        if (update) {
          const newLat = parseFloat(update.latitude);
          const newLng = parseFloat(update.longitude);
          
          if (!isNaN(newLat) && !isNaN(newLng)) {
            console.log(`✅ Updating vehicle ${vehicle.vehicle_id} with NEW coordinates: ${newLat}, ${newLng}`); // Re-enabled debugging log
            return {
              ...vehicle,
              position: {
                lat: newLat,
                lng: newLng,
                timestamp: update.timestamp
              }
            };
          } else {
            console.log(`❌ Invalid coordinates for vehicle ${vehicle.vehicle_id}:`, update); // Re-enabled debugging log
          }
        }
        
        // Return vehicle with existing position if no SWR update
        return vehicle;
      });
    } else {
      console.log("No SWR coordinate data yet, using initial vehicles data"); // Re-enabled debugging log
    }

    console.log("Final updated vehicles:", result.map(v => ({  // Re-enabled debugging log
      vehicle_id: v.vehicle_id, 
      name: v.name, 
      hasPosition: !!v.position,
      position: v.position,
      gps_id: v.gps_id
    })));
    console.log("=== END PROCESSING ==="); // Re-enabled debugging log
    
    return result;
  }, [vehicles, realTimeCoordinateData]);

  // Debug initial vehicles when they change
  useEffect(() => {
    console.log("=== VEHICLES PROP CHANGED ===");
    console.log("New vehicles received:", vehicles.map(v => ({
      vehicle_id: v.vehicle_id,
      name: v.name,
      gps_id: v.gps_id,
      hasPosition: !!v.position,
      position: v.position
    })));
  }, [vehicles]);

  // Debug SWR data when it changes
  useEffect(() => {
    if (realTimeCoordinateData) {
      console.log("=== SWR COORDINATE DATA CHANGED ===");
      console.log("SWR data:", realTimeCoordinateData);
    }
  }, [realTimeCoordinateData]);

  // Debug error state
  useEffect(() => {
    if (error) {
      console.error("=== SWR ERROR ===");
      console.error("SWR Error:", error);
    }
  }, [error]);

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
    },
    finishMultiPolygon: () => {
      if (drawingHandlerRef.current) {
        drawingHandlerRef.current.finishMultiPolygon();
      }
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

  return (
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
        ref={drawingHandlerRef}
        isDrawingMode={isDrawingMode}
        isMultiPolygon={isMultiPolygon}
        onPolygonComplete={handlePolygonComplete}
      />

      {/* Vehicles markers */}
      {!isDrawingMode && updatedVehicles.map((vehicle) => {
        console.log(`🚗 Rendering vehicle ${vehicle.vehicle_id}:`, {
          hasPosition: !!vehicle.position,
          position: vehicle.position,
          dataSource: wsCoordinateData ? 'WebSocket' : 'SWR'
        });
        
        // Get latest vehicle data for this vehicle
        const latestVehicleData = vehicleData?.find(data => data.gps_id === vehicle.gps_id);
        
        // Get geofence status for this vehicle
        const geofenceStatus = getGeofenceStatus(vehicle, geofences);
        
        return vehicle.position ? (
          <Marker
            key={`vehicle-${vehicle.vehicle_id}`}
            position={[vehicle.position.lat, vehicle.position.lng]}
            icon={vehicleIcon}
          >
            <Popup maxWidth={320}>
              <div style={{ padding: '8px', fontFamily: 'Arial, sans-serif' }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '12px', 
                  color: '#1e40af',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '8px',
                  textAlign: 'center'
                }}>
                  {vehicle.name}
                </h3>
                
                <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                  {/* Basic Info */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ flex: 1, marginRight: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>Plat Nomor</div>
                        <div style={{ fontWeight: '600', color: '#374151' }}>{vehicle.license_plate}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>GPS ID</div>
                        <div style={{ fontWeight: '600', color: '#374151' }}>{vehicle.gps_id}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Lokasi</div>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ marginBottom: '3px' }}>
                        <span style={{ color: '#6b7280' }}>Latitude: </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{vehicle.position.lat.toFixed(6)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Longitude: </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{vehicle.position.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Geofence Status */}
                  <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    marginBottom: '12px' 
                  }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Status Geofence</div>
                    {geofenceStatus ? (
                      <div style={{ 
                        padding: '6px 8px', 
                        borderRadius: '4px',
                        borderLeft: geofenceStatus.inside ? '4px solid #10b981' : '4px solid #ef4444',
                        backgroundColor: geofenceStatus.inside ? '#d1fae5' : '#fee2e2'
                      }}>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: '500',
                          color: geofenceStatus.inside ? '#065f46' : '#991b1b'
                        }}>
                          {geofenceStatus.inside 
                            ? `Dalam area: ${geofenceStatus.name}`
                            : geofenceStatus.name 
                              ? `Di luar area: ${geofenceStatus.name} (${(geofenceStatus.distance/1000).toFixed(2)} km)`
                              : 'Di luar semua area'
                          }
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Tidak ada geofence aktif</div>
                    )}
                  </div>
                  
                  {/* Vehicle Data */}
                  {latestVehicleData && (
                    <div style={{ 
                      backgroundColor: '#eff6ff', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Data Kendaraan</div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ 
                          flex: 1, 
                          textAlign: 'center', 
                          padding: '8px', 
                          backgroundColor: 'white', 
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Kecepatan</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>{latestVehicleData.speed || 0}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>km/h</div>
                        </div>
                      </div>
                       
                      {(latestVehicleData.fuel_level || latestVehicleData.battery_level) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          {latestVehicleData.fuel_level && (
                            <div style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              padding: '8px', 
                              backgroundColor: 'white', 
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Bahan Bakar</div>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ea580c' }}>{latestVehicleData.fuel_level}%</div>
                            </div>
                          )}
                          {latestVehicleData.battery_level && (
                            <div style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              padding: '8px', 
                              backgroundColor: 'white', 
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Baterai</div>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#9333ea' }}>{latestVehicleData.battery_level}%</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {latestVehicleData.ignition_status !== undefined && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Status Mesin</div>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '4px 12px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: latestVehicleData.ignition_status ? '#dcfce7' : '#fee2e2',
                            color: latestVehicleData.ignition_status ? '#166534' : '#991b1b'
                          }}>
                            {latestVehicleData.ignition_status ? 'AKTIF' : 'MATI'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div style={{ 
                    borderTop: '1px solid #e5e7eb', 
                    paddingTop: '8px', 
                    textAlign: 'center' 
                  }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      <span style={{ fontWeight: '600' }}>Update Terakhir:</span><br/>
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
          </Marker>
        ) : (
          // console.log(`Vehicle ${vehicle.vehicle_id} has no position data`),
          null
        );
      })}

      {/* Vehicle path/history */}
      {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (() => {
        // Validate path coordinates before rendering
        const validPath = selectedVehicle.path.filter(coord => 
          coord && 
          !isNaN(coord.lat) && !isNaN(coord.lng) &&
          coord.lat >= -90 && coord.lat <= 90 &&
          coord.lng >= -180 && coord.lng <= 180
        );
        
        // console.log(`Rendering path for vehicle ${selectedVehicle.vehicle_id}: ${validPath.length}/${selectedVehicle.path.length} valid coordinates`);
        
        return validPath.length > 1 ? (
          <Polyline 
            positions={validPath.map(coord => [coord.lat, coord.lng])}
            color="blue" 
            weight={3}
            opacity={0.8}
          />
        ) : null;
      })()}

      {/* Geofences - hidden during drawing */}
      {!isDrawingMode && geofences.map((geofence) => {
        // console.log('MapComponent rendering geofence:', geofence);
        
        let polygons = [];
        
        try {
          // Parse geofence definition
          const geoData = typeof geofence.definition === 'string' 
            ? JSON.parse(geofence.definition) 
            : geofence.definition;
          
          // console.log('Geofence geoData:', geoData);
          
          if (geoData && geoData.coordinates) {
            if (geoData.type === 'Polygon') {
              // Single polygon: convert [lng, lat] to [lat, lng]
              const coords = geoData.coordinates[0].map(coord => [coord[1], coord[0]]);
              polygons.push(coords);
              // console.log('Polygon coords:', coords);
            } else if (geoData.type === 'MultiPolygon') {
              // MultiPolygon: process each polygon
              polygons = geoData.coordinates.map(polygonCoords => 
                polygonCoords[0].map(coord => [coord[1], coord[0]])
              );
              // console.log('MultiPolygon coords:', polygons);
            }
          }
        } catch (e) {
          // console.error('Error parsing geofence data:', e);
        }

        // console.log('Final polygons to render:', polygons);

        // Render polygons
        return polygons.map((coords, index) => {
          // console.log(`Rendering polygon ${index} for geofence ${geofence.name}:`, coords);
          return (
            <Polygon
              key={`geofence-${geofence.geofence_id || geofence.id || index}-${index}`}
              positions={coords}
              color={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
              fillColor={geofence.rule_type === 'FORBIDDEN' ? 'red' : 'green'}
              fillOpacity={0.1}
              weight={2}
              opacity={0.8}
            >
              <Popup>
                <div>
                  <h3 className="font-bold">{geofence.name}</h3>
                  <p><strong>Tipe:</strong> {geofence.rule_type}</p>
                  <p><strong>Status:</strong> {geofence.status}</p>
                  {(geofence.vehicle_id || geofence.vehicleId || geofence.user_id) && (
                    <p><strong>Kendaraan:</strong> {geofence.vehicle_id || geofence.vehicleId || geofence.user_id}</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        });
      })}

      {/* Drawing mode indicator */}
      {isDrawingMode && (
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#007bff',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Mode Drawing Aktif {isMultiPolygon ? '(Multipolygon)' : '(Polygon)'} - klik kiri untuk titik, klik kanan untuk selesai (min 3 titik)
          </span>
        </div>
      )}
    </MapContainer>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;