// components/MapComponent.js - Final version with geofence drawing and working history
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

// Component to fly to position
const FlyToVehicle = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);
    }
  }, [position, map]);
  return null;
};

// Drawing handler component
const DrawingHandler = ({ isDrawingMode, onPolygonComplete }) => {
  const map = useMap();
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempMarkers, setTempMarkers] = useState([]);
  const [tempPolyline, setTempPolyline] = useState(null);

  // Handle map clicks for drawing
  useMapEvents({
    click: (e) => {
      if (!isDrawingMode) return;
      
      console.log('Map clicked in drawing mode:', e.latlng);
      
      const newPoint = [e.latlng.lat, e.latlng.lng];
      const newPolygon = [...currentPolygon, newPoint];
      
      setCurrentPolygon(newPolygon);
      setIsDrawing(true);
      
      // Add marker for each point
      const marker = L.marker(e.latlng, {
        icon: polygonPointIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
      setTempMarkers(prev => [...prev, marker]);
      
      // Create temporary polyline
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
      // Right click to complete polygon
      if (!isDrawingMode || currentPolygon.length < 3) return;
      
      console.log('Right click - completing polygon:', currentPolygon);
      
      // Send coordinates to parent
      onPolygonComplete(currentPolygon);
      
      // Reset state
      setCurrentPolygon([]);
      setIsDrawing(false);
      
      // Clear temporary markers and polyline
      tempMarkers.forEach(marker => map.removeLayer(marker));
      setTempMarkers([]);
      
      if (tempPolyline) {
        map.removeLayer(tempPolyline);
        setTempPolyline(null);
      }
    }
  });

  // Reset when drawing mode is disabled
  useEffect(() => {
    if (!isDrawingMode) {
      console.log('Drawing mode disabled, cleaning up...');
      setCurrentPolygon([]);
      setIsDrawing(false);
      
      // Clear temporary markers
      tempMarkers.forEach(marker => map.removeLayer(marker));
      setTempMarkers([]);
      
      // Clear temporary polyline
      if (tempPolyline) {
        map.removeLayer(tempPolyline);
        setTempPolyline(null);
      }
    } else {
      console.log('Drawing mode enabled!');
    }
  }, [isDrawingMode, map, tempMarkers, tempPolyline]);

  // Render temporary polygon while drawing
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
  onMapReady,
  geofences = []
}, ref) => {
  const [selected, setSelected] = useState(null);
  const [flyPosition, setFlyPosition] = useState(null);
  const [historyPolyline, setHistoryPolyline] = useState(null); // Add state for history polyline
  const mapRef = useRef(null);

  // Initial map center
  const initialCenter =
    vehicles.length > 0 && vehicles[0].position
      ? [vehicles[0].position.lat, vehicles[0].position.lng]
      : [-6.914744, 107.609810]; // Bandung coordinates

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('MapComponent mounted/updated');
    console.log('Vehicles:', vehicles);
    console.log('Props received:', { isDrawingMode, onPolygonComplete, onMapReady });
  }, [vehicles, isDrawingMode, onPolygonComplete, onMapReady]);

  // PENTING: Expose functions to parent - ini yang hilang di versi sebelumnya!
  useImperativeHandle(ref, () => {
    console.log('🔧 MapComponent: useImperativeHandle called');
    const methods = {
      flyToVehicle: (position) => {
        console.log('🚀 MapComponent: flyToVehicle called with', position);
        setFlyPosition(position);
      },
      // TAMBAHAN: Method drawHistoryPolyline yang hilang!
      drawHistoryPolyline: (coords) => {
        console.log('📍 MapComponent: drawHistoryPolyline called with coords:', coords);
        
        if (!coords || coords.length === 0) {
          console.log('⚠️ MapComponent: No coordinates provided for history polyline');
          setHistoryPolyline(null);
          return;
        }

        // Convert coordinates to the format expected by react-leaflet
        let positions = [];
        
        if (Array.isArray(coords)) {
          positions = coords.map(coord => {
            if (coord.lat && coord.lng) {
              return [coord.lat, coord.lng];
            } else if (Array.isArray(coord) && coord.length >= 2) {
              return [coord[0], coord[1]];
            }
            return null;
          }).filter(pos => pos !== null);
        }

        console.log('📊 MapComponent: Processed positions for polyline:', positions);
        
        if (positions.length > 0) {
          setHistoryPolyline(positions);
          // Fly to the first position
          setFlyPosition([positions[0][0], positions[0][1]]);
          console.log('✅ MapComponent: History polyline set successfully');
        } else {
          console.error('❌ MapComponent: Unable to process coordinates for history polyline');
          setHistoryPolyline(null);
        }
      },
      clearHistoryPolyline: () => {
        console.log('🧹 MapComponent: clearHistoryPolyline called');
        setHistoryPolyline(null);
      }
    };
    
    console.log('🎯 MapComponent: Returning methods:', Object.keys(methods));
    console.log('🔍 MapComponent: drawHistoryPolyline type:', typeof methods.drawHistoryPolyline);
    return methods;
  }, []);

  // Effect when vehicle is selected
  useEffect(() => {
    if (selectedVehicle?.position) {
      setFlyPosition([selectedVehicle.position.lat, selectedVehicle.position.lng]);
    }
  }, [selectedVehicle]);

  // Handle polygon completion from drawing
  const handlePolygonComplete = (coordinates) => {
    console.log('Polygon completed with coordinates:', coordinates);
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
      whenReady={() => {
        console.log('🗺️ MapContainer is ready!');
        setFlyPosition(initialCenter);
        if (onMapReady) {
          console.log('📢 Calling onMapReady callback');
          onMapReady();
        }
      }}
      className="map-container"
      dragging={!isDrawingMode}
      scrollWheelZoom={!isDrawingMode}
      doubleClickZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Fly to position component */}
      {flyPosition && <FlyToVehicle position={flyPosition} />}

      {/* Drawing handler component */}
      <DrawingHandler 
        isDrawingMode={isDrawingMode}
        onPolygonComplete={handlePolygonComplete}
      />

      {/* Vehicle markers - hidden during drawing */}
      {!isDrawingMode && vehicles.map((vehicle) =>
        vehicle.position ? (
          <Marker
            key={vehicle.id}
            position={[vehicle.position.lat, vehicle.position.lng]}
            icon={vehicleIcon}
            eventHandlers={{
              click: () => setSelected(vehicle),
            }}
          />
        ) : null
      )}

      {/* Vehicle popup */}
      {selected && !isDrawingMode && (
        <Popup
          position={[selected.position.lat, selected.position.lng]}
          onClose={() => setSelected(null)}
        >
          <div>
            <h3>
              {selected.merek} {selected.model} ({selected.nomor_kendaraan})
            </h3>
            <p>
              <strong>Status:</strong> {selected.status || "Tidak diketahui"}
            </p>
            <p>
              <strong>Koordinat:</strong> {selected.position.lat}, {selected.position.lng}
            </p>
            <p>
              <strong>Update:</strong>{" "}
              {new Date(selected.position.timestamp).toLocaleString()}
            </p>
          </div>
        </Popup>
      )}

      {/* Vehicle path/history - hidden during drawing */}
      {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (
        <Polyline positions={selectedVehicle.path} color="blue" weight={4} />
      )}

      {/* History polyline - shown when drawHistoryPolyline is called */}
      {!isDrawingMode && historyPolyline && historyPolyline.length > 1 && (
        <Polyline 
          positions={historyPolyline} 
          color="red" 
          weight={3}
          opacity={0.8}
          dashArray="10, 5"
        />
      )}

      {/* Existing geofences - hidden during drawing */}
      {!isDrawingMode && geofences.map((geofence) => {
        // Parse geofencing data
        let coordinates = [];
        if (geofence.geofencing) {
          try {
            const geoData = typeof geofence.geofencing === 'string' 
              ? JSON.parse(geofence.geofencing) 
              : geofence.geofencing;
            
            if (geoData.geometry && geoData.geometry.coordinates) {
              // Convert from GeoJSON format [lng, lat] to [lat, lng]
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
    </MapContainer>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;