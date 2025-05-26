// pages/Dashboard.js - Kode lengkap dengan polling realtime
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; 
import ModalSetGeofence from "@/components/ModalSetGeofence";

// Import dinamis untuk MapComponent (tanpa SSR)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

// Polling interval dalam milidetik (3 detik)
const POLLING_INTERVAL = 3000;
// Jumlah maksimum percobaan ulang
const MAX_RETRY_COUNT = 3;

export default function Dashboard({ vehicles: initialVehicles }) {
  const router = useRouter();
  
  // Refs
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const lastFetchTimestampRef = useRef(null);
  const retryCountRef = useRef(0);

  // State untuk user dan loading
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk kendaraan
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicles[0] || null);
  const [vehicleHistories, setVehicleHistories] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  // State untuk modal dan notifikasi
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State untuk geofence
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Effect untuk cek autentikasi
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

  // Effect untuk update vehicles dari props
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

  // Fungsi polling data koordinat realtime
  const fetchRealTimeCoordinates = useCallback(async () => {
    try {
      // Build the API URL with appropriate parameters
      let apiUrl = "/api/KoordinatKendaraan?last_only=true";
      
      // If we have a last timestamp, only get newer data
      if (lastFetchTimestampRef.current) {
        apiUrl += `&since=${encodeURIComponent(lastFetchTimestampRef.current)}`;
      }
      
      console.log("Fetching coordinates from:", apiUrl);
      
      // Tambahkan timeout untuk mencegah request menggantung
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);

      // Log response status untuk debugging
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API response error: ${response.status} - ${errorText}`);
        throw new Error(`Gagal mengambil data koordinat realtime (${response.status})`);
      }

      // Reset retry counter on successful request
      retryCountRef.current = 0;

      const result = await response.json();
      console.log("API response data structure:", Object.keys(result));
      
      // Validasi data lebih ketat
      if (!result || !result.success) {
        console.error("API returned unsuccessful response:", result);
        throw new Error("API returned unsuccessful response");
      }
      
      if (!result.data || !Array.isArray(result.data)) {
        console.error("Invalid data format in API response:", result);
        throw new Error("Invalid data format in API response");
      }
      
      if (result.data.length === 0) {
        console.log("Tidak ada data koordinat baru yang diterima");
        return;
      }

      // Update the last fetch timestamp
      lastFetchTimestampRef.current = result.timestamp;

      // Process the coordinate data
      const coordinateUpdates = {};
      result.data.forEach(coord => {
        if (coord && coord.id) {
          coordinateUpdates[coord.id] = coord;
        }
      });

      // Update vehicles with new coordinates
      const updatedVehicles = vehicles.map(vehicle => {
        const update = coordinateUpdates[vehicle.id];
        
        if (update) {
          // Parse new coordinates with validation
          const newLat = parseFloat(update.latitude);
          const newLng = parseFloat(update.longitude);
          
          if (isNaN(newLat) || isNaN(newLng)) {
            console.error("Invalid coordinates for vehicle:", vehicle.id, update);
            return vehicle;
          }
          
          // Return vehicle with updated position
          return {
            ...vehicle,
            position: {
              lat: newLat,
              lng: newLng,
              timestamp: update.timestamp
            }
          };
        }
        
        return vehicle;
      });

      setVehicles(updatedVehicles);
      setLastUpdateTime(new Date());
      
      // Update selected vehicle if it's one of the updated ones
      if (selectedVehicle) {
        const updatedSelectedVehicle = updatedVehicles.find(v => v.id === selectedVehicle.id);
        if (updatedSelectedVehicle && 
            JSON.stringify(updatedSelectedVehicle.position) !== JSON.stringify(selectedVehicle.position)) {
          
          // Preserve path data if exists
          if (selectedVehicle.path) {
            updatedSelectedVehicle.path = selectedVehicle.path;
          }
          
          setSelectedVehicle(updatedSelectedVehicle);
        }
      }
    } catch (error) {
      console.error("Error polling koordinat realtime:", error);
      
      // Increment retry counter
      retryCountRef.current += 1;
      
      if (retryCountRef.current >= MAX_RETRY_COUNT) {
        // Setelah beberapa kali retry, tampilkan pesan error
        console.error(`Failed after ${MAX_RETRY_COUNT} retries`);
        
        // Optional: tampilkan error ke user
        // showErrorMessage("Gagal mengambil data koordinat realtime. Mencoba ulang...");
        
        // Reset counter dan tunggu lebih lama sebelum mencoba lagi
        retryCountRef.current = 0;
        
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          
          // Coba lagi dalam 10 detik
          setTimeout(() => {
            console.log("Retrying after timeout");
            pollingTimerRef.current = setInterval(fetchRealTimeCoordinates, POLLING_INTERVAL);
          }, 10000); // Tunggu 10 detik sebelum mencoba lagi
        }
      }
    }
  }, [vehicles, selectedVehicle]);

  // Setup polling interval
  useEffect(() => {
    // First fetch immediately
    fetchRealTimeCoordinates();
    
    // Then set up interval
    pollingTimerRef.current = setInterval(() => {
      fetchRealTimeCoordinates();
    }, POLLING_INTERVAL);
    
    // Clean up on unmount
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [fetchRealTimeCoordinates]);

  // Fungsi untuk handle klik riwayat kendaraan
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

      // Set selectedVehicle dengan path
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
        onSelectVehicle={vehicle => setSelectedVehicle(vehicle)}
        onHistoryClick={handleHistoryClick}
        onTambahKendaraan={handleTambahKendaraan}
        onDeleteVehicle={handleDeleteVehicle}
        onSetGeofence={handleSetGeofence}
      />

      {/* Main Content */}
      <div className="flex-grow relative">
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          isDrawingMode={isDrawingMode}
          onPolygonComplete={handlePolygonComplete}
          geofences={[]}
        />
        
        {/* Status update indicator */}
        {lastUpdateTime && (
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded-md shadow-md text-sm z-10">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
              <span className="text-gray-600">
                Update terakhir: {lastUpdateTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
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
    // Tambahkan timeout untuk request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const [resKendaraan, resKoordinat] = await Promise.all([
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan", {
        signal: controller.signal
      }),
      fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/koordinat_kendaraan?limit=-1", {
        signal: controller.signal
      }),
    ]);
    
    clearTimeout(timeoutId);

    if (!resKendaraan.ok || !resKoordinat.ok) {
      console.error(`Fetch error: Kendaraan status: ${resKendaraan.status}, Koordinat status: ${resKoordinat.status}`);
      throw new Error("Gagal fetch dari API eksternal.");
    }

    const kendaraan = await resKendaraan.json();
    const koordinat = await resKoordinat.json();

    // Validasi data
    if (!kendaraan || !kendaraan.data || !Array.isArray(kendaraan.data)) {
      console.error("Invalid kendaraan data format:", kendaraan);
      throw new Error("Format data kendaraan tidak valid");
    }
    
    if (!koordinat || !koordinat.data || !Array.isArray(koordinat.data)) {
      console.error("Invalid koordinat data format:", koordinat);
      throw new Error("Format data koordinat tidak valid");
    }

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