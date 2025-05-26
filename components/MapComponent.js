// components/MapComponent.js
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import L from "leaflet";

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
    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5" fill="red" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// FlyToPosition component
const FlyToPosition = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      console.log("FlyToPosition: Flying to position:", position);
      map.flyTo(position, 16);
    }
  }, [position, map]);

  return null;
};

// DrawingHandler component
const DrawingHandler = ({ isDrawingMode, onPolygonComplete }) => {
  const map = useMap();
  const [currentPolygon, setCurrentPolygon] = useState([]);
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
      
      const marker = L.marker(e.latlng, {
        icon: polygonPointIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
      setTempMarkers(prev => [...prev, marker]);
      
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
  });

  useEffect(() => {
    if (!isDrawingMode) {
      setCurrentPolygon([]);
      setIsDrawing(false);
      tempMarkers.forEach(marker => map.removeLayer(marker));
      setTempMarkers([]);
      if (tempPolyline) {
        map.removeLayer(tempPolyline);
        setTempPolyline(null);
      }
    }
  }, [isDrawingMode, map, tempMarkers, tempPolyline]);

  return isDrawing && currentPolygon.length >= 3 ? (
    <Polygon 
      positions={currentPolygon} 
      color="red" 
      fillColor="red" 
      fillOpacity={0.2}
      weight={2}
      dashArray="5, 5"
    />
  ) : null;
};

// Main map component
const MapComponent = forwardRef(({ 
  vehicles, 
  selectedVehicle, 
  isDrawingMode = false,
  onPolygonComplete,
  geofences = []
}, ref) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [flyToPositionWhenSelected, setFlyToPositionWhenSelected] = useState(null);
  
  const lastFlyEventRef = useRef('');
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);

  // Initial map center
  const initialCenter = vehicles.length > 0 && vehicles[0].position
    ? [vehicles[0].position.lat, vehicles[0].position.lng]
    : [-6.914744, 107.609810];

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    flyToVehicle: (position) => {
      console.log("Manual flyToVehicle called with position:", position);
      setFlyToPositionWhenSelected(position);
      lastFlyEventRef.current = 'manual_api_call';
    }
  }));

  // Handle selectedVehicle changes
  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }
    
    console.log("selectedVehicle changed:", {
      id: selectedVehicle.id,
      prev: selectedVehicleId,
      hasPosition: !!selectedVehicle.position
    });
    
    // Check if ID changed (new vehicle selected from sidebar)
    const isNewVehicleSelected = selectedVehicle.id !== selectedVehicleId;
    
    if (isNewVehicleSelected && selectedVehicle.position) {
      console.log(" NEW VEHICLE SELECTED FROM SIDEBAR - flying to position");
      
      setSelectedVehicleId(selectedVehicle.id);
      setFlyToPositionWhenSelected([selectedVehicle.position.lat, selectedVehicle.position.lng]);
      
      lastFlyEventRef.current = 'sidebar_selection';
    } 
    else if (isNewVehicleSelected) {
      console.log("Vehicle selected but has no position");
      setSelectedVehicleId(selectedVehicle.id);
      setFlyToPositionWhenSelected(null);
    }
    else {
      console.log("Only position updated, not flying");
    }
  }, [selectedVehicle, selectedVehicleId]);
  
  // Mark map as ready
  useEffect(() => {
    mapReadyRef.current = true;
    console.log("Map ready");
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
        isDrawingMode={isDrawingMode}
        onPolygonComplete={handlePolygonComplete}
      />

      {/* Vehicles markers */}
      {!isDrawingMode && vehicles.map((vehicle) =>
        vehicle.position ? (
          <Marker
            key={`vehicle-${vehicle.id}`}
            position={[vehicle.position.lat, vehicle.position.lng]}
            icon={vehicleIcon}
          >
            <Popup>
              <div>
                <h3 className="font-bold">
                  {vehicle.merek} {vehicle.model} ({vehicle.nomor_kendaraan})
                </h3>
                <p>
                  <strong>Lokasi:</strong> {vehicle.position.lat.toFixed(6)}, {vehicle.position.lng.toFixed(6)}
                </p>
                <p>
                  <strong>Update:</strong>{" "}
                  {new Date(vehicle.position.timestamp).toLocaleString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}

      {/* Vehicle path/history */}
      {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (
        <Polyline 
          positions={selectedVehicle.path} 
          color="blue" 
          weight={3}
          opacity={0.8}
        />
      )}

      {/* Geofences */}
      {!isDrawingMode && geofences.map((geofence) => {
        let coordinates = [];
        if (geofence.geofencing) {
          try {
            const geoData = typeof geofence.geofencing === 'string' 
              ? JSON.parse(geofence.geofencing) 
              : geofence.geofencing;
            
            if (geoData.geometry && geoData.geometry.coordinates) {
              coordinates = geoData.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            }
          } catch (e) {
            console.error('Error parsing geofence data:', e);
          }
        }

        return coordinates.length > 0 ? (
          <Polygon
            key={geofence.id}
            positions={coordinates}
            color="green"
            fillColor="green"
            fillOpacity={0.1}
            weight={2}
            eventHandlers={{
              click: () => {
                alert(`Geofence: ${geofence.kota}`);
              }
            }}
          />
        ) : null;
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
            Mode Drawing Aktif - klik kiri untuk titik, klik kanan untuk selesai (min 3 titik)
          </span>
        </div>
      )}
      
      {/* Debug Overlay - hapus di production */}
      {false && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            zIndex: 1000,
            maxWidth: '300px',
            fontSize: '12px'
          }}
        >
          <p>selectedVehicleId: {selectedVehicleId}</p>
          <p>Last fly event: {lastFlyEventRef.current}</p>
          <p>flyToPositionWhenSelected: {flyToPositionWhenSelected ? 'set' : 'null'}</p>
        </div>
      )}
    </MapContainer>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;