// components/MapComponent.js - Versi yang berhasil menampilkan history
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
  geofences = []
}, ref) => {
  const [selected, setSelected] = useState(null);
  const [flyPosition, setFlyPosition] = useState(null);
  const mapRef = useRef(null);

  // Initial map center
  const initialCenter =
    vehicles.length > 0 && vehicles[0].position
      ? [vehicles[0].position.lat, vehicles[0].position.lng]
      : [-6.914744, 107.609810]; // Bandung coordinates

  // Expose functions to parent - SEDERHANA
  useImperativeHandle(ref, () => ({
    flyToVehicle: (position) => {
      setFlyPosition(position);
    }
  }));

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
      whenReady={() => setFlyPosition(initialCenter)}
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

      {/* Vehicle path/history - GARIS SOLID BIRU */}
      {!isDrawingMode && selectedVehicle?.path && selectedVehicle.path.length > 1 && (
        <Polyline 
          positions={selectedVehicle.path} 
          color="blue" 
          weight={3}
          opacity={0.8}
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






'use client';

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/router";
import Image from "next/image";

const SidebarComponent = ({ 
  vehicles = [], 
  onSelectVehicle, 
  onTambahKendaraan, 
  onDeleteVehicle,
  onSetGeofence, // TAMBAHAN: Props untuk handle geofence
  onHistoryClick // TAMBAHAN: Props untuk handle history dari dashboard
}) => {
  const router = useRouter();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // TAMBAHAN dari code 2: State untuk relay
  const [relays, setRelays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk modal notifikasi "tidak ada history"
  const [showNoHistoryAlert, setShowNoHistoryAlert] = useState(false);
  
  // TAMBAHAN dari code 2: State untuk notifikasi relay
  const [showRelayNotification, setShowRelayNotification] = useState(false);
  const [relayMessage, setRelayMessage] = useState('');
  const [relayNotifStatus, setRelayNotifStatus] = useState('success');

  // TAMBAHAN dari code 2: Fungsi untuk mengambil data relay melalui proxy API
  useEffect(() => {
    fetchRelays();
  }, []);

  const fetchRelays = async () => {
    try {
      // Use local Next.js API route instead of direct EC2 endpoint
      const response = await fetch("/api/relays");
      if (!response.ok) {
        throw new Error(`Failed to fetch relays: ${response.status}`);
      }
      const data = await response.json();
      setRelays(data.data || []);
    } catch (error) {
      console.error("Error fetching relays:", error);
      // Silently fail but log the error - prevent component from crashing
      setRelays([]);
    }
  };

  // Fungsi untuk logout dari aplikasi
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        localStorage.removeItem("token");
        router.push("/auth/login");
      })
      .catch((error) => {
        console.error("Logout Error:", error);
      });
  };

  // Fungsi untuk memilih kendaraan dan reset riwayat
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setShowHistory(false);
    onSelectVehicle(vehicle);
  };

  // UPDATED: Fungsi untuk menampilkan atau menyembunyikan riwayat kendaraan
  const handleHistoryClick = () => {
    if (!selectedVehicleId) {
      alert("Pilih kendaraan terlebih dahulu.");
      return;
    }

    // Cek apakah kendaraan memiliki lokasi/position
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle || !selectedVehicle.position) {
      setShowNoHistoryAlert(true);
      return;
    }

    if (showHistory) {
      const selected = vehicles.find((v) => v.id === selectedVehicleId);
      if (selected) {
        onSelectVehicle({ ...selected, path: [] });
      }
      setShowHistory(false);
    } else {
      // UPDATED: Gunakan onHistoryClick dari props untuk kependensi dengan dashboard
      if (onHistoryClick) {
        onHistoryClick(selectedVehicleId);
        setShowHistory(true);
      } else {
        // Fallback ke cara lama jika props tidak ada
        fetch("/api/history")
          .then((res) => res.json())
          .then((data) => {
            const riwayat = data.data
              .filter((item) => item.id === selectedVehicleId)
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
              .map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)]);

            const selected = vehicles.find((v) => v.id === selectedVehicleId);
            if (selected) {
              onSelectVehicle({ ...selected, path: riwayat });
            }
            setShowHistory(true);
          })
          .catch((err) => {
            console.error("Gagal ambil riwayat koordinat:", err);
          });
      }
    }
  };

  // TAMBAHAN: Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    if (onSetGeofence) {
      onSetGeofence();
    }
  };

  // TAMBAHAN dari code 2: Fungsi untuk mengontrol relay (ENGINE ON)
  const handleEngineOn = async () => {
    if (!selectedVehicleId) {
      showRelayNotif("Pilih kendaraan terlebih dahulu.", "error");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle.relay_id) {
      showRelayNotif(`Kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) tidak memiliki relay terpasang.`, "error");
      return;
    }

    setIsLoading(true);
    try {
      const relayId = selectedVehicle.relay_id;
      const relay = relays.find(r => r.id === relayId);
      
      if (!relay) {
        showRelayNotif(`Relay dengan ID ${relayId} tidak ditemukan.`, "error");
        setIsLoading(false);
        return;
      }
      
      // Use local Next.js API route instead of direct EC2 endpoint
      const response = await fetch(`/api/relays/${relayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: 1,
          last_updated: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        await fetchRelays();
        showRelayNotif(`Mesin kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) berhasil dinyalakan!`, "success");
      } else {
        const errorData = await response.json();
        showRelayNotif(`Gagal menyalakan mesin: ${errorData.errors?.[0]?.message || 'Unknown error'}`, "error");
      }
    } catch (error) {
      console.error("Error turning on engine:", error);
      showRelayNotif(`Terjadi kesalahan: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // TAMBAHAN dari code 2: Fungsi untuk mengontrol relay (ENGINE OFF)
  const handleEngineOff = async () => {
    if (!selectedVehicleId) {
      showRelayNotif("Pilih kendaraan terlebih dahulu.", "error");
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle.relay_id) {
      showRelayNotif(`Kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) tidak memiliki relay terpasang.`, "error");
      return;
    }

    setIsLoading(true);
    try {
      const relayId = selectedVehicle.relay_id;
      const relay = relays.find(r => r.id === relayId);
      
      if (!relay) {
        showRelayNotif(`Relay dengan ID ${relayId} tidak ditemukan.`, "error");
        setIsLoading(false);
        return;
      }
      
      // Use local Next.js API route
      const response = await fetch(`/api/relays/${relayId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: 0,
          last_updated: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        await fetchRelays();
        showRelayNotif(`Mesin kendaraan ${selectedVehicle.model} (${selectedVehicle.nomor_kendaraan}) berhasil dimatikan!`, "success");
      } else {
        const errorData = await response.json();
        showRelayNotif(`Gagal mematikan mesin: ${errorData.errors?.[0]?.message || 'Unknown error'}`, "error");
      }
    } catch (error) {
      console.error("Error turning off engine:", error);
      showRelayNotif(`Terjadi kesalahan: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // TAMBAHAN dari code 2: Fungsi untuk menampilkan notifikasi relay
  const showRelayNotif = (message, status) => {
    setRelayMessage(message);
    setRelayNotifStatus(status);
    setShowRelayNotification(true);

    setTimeout(() => {
      setShowRelayNotification(false);
      setRelayMessage('');
    }, 3000);
  };

  // Fungsi untuk menampilkan konfirmasi hapus kendaraan
  const handleShowDeleteConfirm = (vehicle, e) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setShowDeleteConfirm(true);
  };

  // Fungsi untuk membatalkan penghapusan
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVehicleToDelete(null);
  };

  // Fungsi untuk menampilkan notifikasi sukses
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
    
    // Auto hide notification after 3 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
      setSuccessMessage('');
    }, 3000);
  };

  // Fungsi untuk menutup notifikasi sukses
  const handleCloseSuccessNotification = () => {
    setShowSuccessNotification(false);
    setSuccessMessage('');
  };

  // TAMBAHAN dari code 2: Fungsi untuk menutup notifikasi relay
  const handleCloseRelayNotification = () => {
    setShowRelayNotification(false);
    setRelayMessage('');
  };

  // Fungsi untuk menghapus kendaraan
  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      console.log('Deleting vehicle:', vehicleToDelete);
      
      if (selectedVehicleId === vehicleToDelete.id) {
        setSelectedVehicleId(null);
        setShowHistory(false);
      }
      
      const deletedVehicle = vehicleToDelete;
      onDeleteVehicle(vehicleToDelete.id);
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
      
      showSuccessMessage(`Kendaraan ${deletedVehicle.model} (${deletedVehicle.nomor_kendaraan}) berhasil dihapus!`);
    }
  };

  // TAMBAHAN dari code 2: Mendapatkan status relay untuk kendaraan yang dipilih
  const getSelectedVehicleRelayStatus = () => {
    if (!selectedVehicleId) return null;

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle || !selectedVehicle.relay_id) return null;

    const relay = relays.find(r => r.id === selectedVehicle.relay_id);
    return relay ? relay.is_active : null;
  };

  const selectedRelayStatus = getSelectedVehicleRelayStatus();

  return (
    <div className="w-80 bg-white shadow-md h-screen flex flex-col p-4">
      {/* Logo aplikasi */}
      <div className="flex justify-center mb-6 mt-4">
        <Image src="/icon/logo_web.png" alt="VehiTrack Logo" width={150} height={50} />
      </div>

      <h2 className="text-center font-bold text-lg mb-3">Daftar Kendaraan</h2>

      <div className="flex-grow overflow-y-auto">
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => {
            // Debug logging untuk melihat struktur data setiap kendaraan
            console.log("Vehicle data structure:", vehicle);
            
            return (
              <div
                key={vehicle.id}
                className={`p-3 mb-2 rounded-md cursor-pointer relative ${
                  selectedVehicleId === vehicle.id ? "bg-blue-200" : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleSelectVehicle(vehicle)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{vehicle.model} ({vehicle.nomor_kendaraan})</p>
                    {/* Handle kedua kemungkinan field name untuk jenis kendaraan */}
                    <p className="text-sm text-black">
                      Jenis: {vehicle.jenis_kendaraan || vehicle.Jenis_Kendaraan || vehicle.jenis || "Tidak tersedia"}
                    </p>
                    <p className="text-sm text-black">Merek: {vehicle.merek || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Warna: {vehicle.warna || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Pemilik: {vehicle.pemilik || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">Tahun: {vehicle.tahun_pembuatan || "Tidak tersedia"}</p>
                    <p className="text-sm text-black">
                      Lokasi: {vehicle.position 
                        ? `${vehicle.position.lat.toFixed(5)}, ${vehicle.position.lng.toFixed(5)}` 
                        : "Tidak tersedia"}
                    </p>
                    {/* TAMBAHAN dari code 2: Tampilkan status mesin */}
                    {vehicle.relay_id && (
                      <p className="text-sm text-black">
                        Status Mesin: {
                          relays.find(r => r.id === vehicle.relay_id)?.is_active === 1
                             ? <span className="text-green-600 font-semibold">ON</span>
                             : <span className="text-red-600 font-semibold">OFF</span>
                        }
                      </p>
                    )}
                  </div>
                  {/* Tombol hapus untuk setiap kendaraan */}
                  <button 
                    onClick={(e) => handleShowDeleteConfirm(vehicle, e)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200"
                    title={`Hapus kendaraan ${vehicle.model}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500">Tidak ada kendaraan</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {/* TAMBAHAN dari code 2: Button ENGINE ON dengan loading state */}
        <button 
          onClick={handleEngineOn}
          disabled={isLoading || !selectedVehicleId}
          className={`w-full py-2 ${
            isLoading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
          } text-white rounded-md transition-colors duration-200 flex justify-center items-center`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              LOADING...
            </>
          ) : (
            'ENGINE ON'
          )}
        </button>
        
        {/* TAMBAHAN dari code 2: Button ENGINE OFF dengan loading state */}
        <button 
          onClick={handleEngineOff}
          disabled={isLoading || !selectedVehicleId}
          className={`w-full py-2 ${
            isLoading ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
          } text-white rounded-md transition-colors duration-200 flex justify-center items-center`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              LOADING...
            </>
          ) : (
            'ENGINE OFF'
          )}
        </button>
        
        <button 
          onClick={onTambahKendaraan} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          TAMBAH KENDARAAN
        </button>
        {/* UPDATED: Button SET GEOFENCE dengan handler */}
        <button 
          onClick={handleSetGeofence}
          className="w-full py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors duration-200"
        >
          SET GEOFENCE
        </button>
        <button 
          onClick={handleHistoryClick} 
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}
        </button>
      </div>

      {/* Tombol logout */}
      <button 
        onClick={handleLogout} 
        className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 text-lg rounded-md w-full transition-colors duration-200"
      >
        Logout
      </button>

      {/* Modal notifikasi tidak ada history */}
      {showNoHistoryAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-500">⚠️ Tidak Ada History</h3>
            <p className="mb-4">
              Kendaraan <strong>
                {vehicles.find(v => v.id === selectedVehicleId)?.model} (
                {vehicles.find(v => v.id === selectedVehicleId)?.nomor_kendaraan})
              </strong> tidak memiliki data lokasi. History perjalanan tidak tersedia.
            </p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowNoHistoryAlert(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {showDeleteConfirm && vehicleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="mb-4">
              Apakah Anda yakin ingin menghapus kendaraan <strong>{vehicleToDelete.model}</strong> dengan nomor <strong>{vehicleToDelete.nomor_kendaraan}</strong>?
            </p>
            <div className="flex justify-end mt-6 space-x-2">
              <button 
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal notifikasi sukses */}
      {showSuccessNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4 text-green-600">Berhasil Menghapus Kendaraan!</h3>
            <p className="mb-4">{successMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleCloseSuccessNotification}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAMBAHAN dari code 2: Modal notifikasi relay */}
      {showRelayNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md">
            <h3 className={`text-lg font-bold mb-4 ${relayNotifStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {relayNotifStatus === 'success' ? '✅ Berhasil' : '⚠️ Gagal'}
            </h3>
            <p className="mb-4">{relayMessage}</p>
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleCloseRelayNotification}
                className={`px-4 py-2 ${
                  relayNotifStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                } text-white rounded-md transition-colors duration-200`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarComponent;





import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; 
import ModalSetGeofence from "@/components/ModalSetGeofence";

const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard({ vehicles: initialVehicles }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicles[0] || null);
  const [vehicleHistories, setVehicleHistories] = useState([]);
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // States untuk geofence
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

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

  // Fungsi untuk handle klik kendaraan dari sidebar - SEPERTI YANG BERHASIL
  const handleHistoryClick = async (vehicleId) => {
    if (!vehicleId) return;
  
    try {
      const res = await fetch("/api/history");
      if (!res.ok) {
        throw new Error("Gagal mengambil data riwayat");
      }
      
      const data = await res.json();
  
      const filteredCoords = data.data
        .filter(coord => coord.id === vehicleId)
        .map(coord => ({
          lat: parseFloat(coord.latitude),
          lng: parseFloat(coord.longitude),
        }));

      // Set selectedVehicle dengan path - SEPERTI YANG BERHASIL
      const vehicleWithHistory = {
        ...vehicles.find(v => v.id === vehicleId),
        path: filteredCoords
      };
      
      setSelectedVehicle(vehicleWithHistory);
  
    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
      showErrorMessage("Gagal memuat riwayat kendaraan");
    }
  };

  // Fungsi untuk menampilkan modal tambah kendaraan
  const handleTambahKendaraan = () => {
    setShowTambahModal(true);
  };

  // Fungsi untuk ketika kendaraan berhasil ditambah
  const handleTambahSukses = () => {
    setShowTambahModal(false);
    router.reload();
  };

  // Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    setShowGeofenceModal(true);
  };

  // Handler untuk drawing mode
  const handleStartDrawing = (start = true) => {
    setIsDrawingMode(start);
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
    router.reload();
  };

  // Handler untuk menutup modal geofence
  const handleCloseGeofenceModal = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
  };

  // Fungsi untuk menghapus kendaraan
  const handleDeleteVehicle = async (vehicleId) => {
    try {
      console.log(`Menghapus kendaraan dengan ID: ${vehicleId}`);
      
      const response = await fetch(`/api/HapusKendaraan?id=${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Response status:', response.status);
      
      const text = await response.text();
      console.log('Response text:', text);
      
      if (!response.ok) {
        let errorMessage = 'Terjadi kesalahan';
        
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || 'Terjadi kesalahan';
        } catch (e) {
          errorMessage = text || 'Terjadi kesalahan';
        }
        
        showErrorMessage(`Gagal menghapus kendaraan: ${errorMessage}`);
        return;
      }
      
      let data = null;
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
        }
      }
      
      const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
      setVehicles(updatedVehicles);
      
      if (selectedVehicle && selectedVehicle.id === vehicleId) {
        setSelectedVehicle(updatedVehicles.length > 0 ? updatedVehicles[0] : null);
      }
      
    } catch (error) {
      console.error('Error menghapus kendaraan:', error);
      showErrorMessage(`Terjadi kesalahan saat menghapus kendaraan: ${error.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="h-screen bg-gray-100 flex relative">
      <SidebarComponent 
        vehicles={vehicles}
        onSelectVehicle={vehicle => setSelectedVehicle(vehicle)}
        onHistoryClick={handleHistoryClick}
        onTambahKendaraan={handleTambahKendaraan}
        onDeleteVehicle={handleDeleteVehicle}
        onSetGeofence={handleSetGeofence}
      />

      <div className="flex-grow">
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          isDrawingMode={isDrawingMode}
          onPolygonComplete={handlePolygonComplete}
          geofences={[]}
        />
      </div>

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
    const [resKendaraan, resKoordinat] = await Promise.all([
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan"),
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1"),
    ]);

    if (!resKendaraan.ok || !resKoordinat.ok) {
      throw new Error("Gagal fetch dari API eksternal.");
    }

    const kendaraan = await resKendaraan.json();
    const koordinat = await resKoordinat.json();

    const combined = kendaraan.data.map((vehicle) => {
      const vehicleCoords = koordinat.data
        .filter((coord) => coord.id === vehicle.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const latest = vehicleCoords[0];

      return {
        ...vehicle,
        position: latest
          ? {
              lat: parseFloat(latest.latitude),
              lng: parseFloat(latest.longitude),
              timestamp: latest.timestamp,
            }
          : null,
      };
    });

    return { props: { vehicles: combined } };
  } catch (err) {
    console.error("❌ Gagal fetch data server:", err);
    return { props: { vehicles: [] } };
  }
}