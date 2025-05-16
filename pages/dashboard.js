import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import SidebarComponent from "../components/SidebarComponent";
import ModalTambahKendaraan from "@/components/ModalTambahKendaraan"; 
import ModalSetGeofence from "@/components/ModalSetGeofence"; // TAMBAHAN: Import ModalSetGeofence

const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

export default function Dashboard({ vehicles: initialVehicles }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null); // TAMBAHAN: Ref untuk modal geofence

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState(initialVehicles || []); // State untuk menyimpan daftar kendaraan
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicles[0] || null);
  const [vehicleHistories, setVehicleHistories] = useState([]);
  const [showTambahModal, setShowTambahModal] = useState(false); 
  const [showErrorAlert, setShowErrorAlert] = useState(false);  // State untuk error alert
  const [errorMessage, setErrorMessage] = useState('');  // State untuk error message
  
  // TAMBAHAN: States untuk geofence
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace("/"); // redirect jika tidak ada user yang terautentikasi
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Update vehicles state ketika initialVehicles berubah
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  // Fungsi untuk menampilkan error alert
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
    
    // Auto hide alert after 5 seconds
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

  // Fungsi untuk handle klik kendaraan dari sidebar
  const handleHistoryClick = async (vehicleId) => {
    if (!vehicleId) return;
  
    try {
      const res = await fetch("/api/history"); // Pastikan endpoint ini benar
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
  
      if (mapRef.current) {
        mapRef.current.drawHistoryPolyline(filteredCoords); // Pastikan fungsi ini ada di MapComponent
      }
  
    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
    }
  };

  // Fungsi untuk menampilkan modal tambah kendaraan
  const handleTambahKendaraan = () => {
    setShowTambahModal(true);
  };

  // Fungsi untuk ketika kendaraan berhasil ditambah
  const handleTambahSukses = () => {
    setShowTambahModal(false);
    router.reload(); // Reload halaman untuk menampilkan kendaraan baru
  };

  // TAMBAHAN: Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    setShowGeofenceModal(true);
  };

  // TAMBAHAN: Handler untuk drawing mode
  const handleStartDrawing = (start = true) => {
    setIsDrawingMode(start);
  };

  // TAMBAHAN: Handler untuk polygon completion
  const handlePolygonComplete = (coordinates) => {
    // Pass coordinates ke modal geofence
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handlePolygonComplete(coordinates);
    }
  };

  // TAMBAHAN: Handler untuk ketika geofence berhasil dibuat
  const handleGeofenceSukses = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    // Anda bisa reload atau update state sesuai kebutuhan
    router.reload(); // Reload untuk menampilkan geofence baru
  };

  // TAMBAHAN: Handler untuk menutup modal geofence
  const handleCloseGeofenceModal = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
  };

  // Fungsi untuk menghapus kendaraan
  const handleDeleteVehicle = async (vehicleId) => {
    try {
      console.log(`Menghapus kendaraan dengan ID: ${vehicleId}`);
      
      // Kirim request DELETE ke API dengan URL yang konsisten dengan TambahKendaraan
      const response = await fetch(`/api/HapusKendaraan?id=${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Response status:', response.status);
      
      // Ambil respons sebagai teks terlebih dahulu (seperti di TambahKendaraan)
      const text = await response.text();
      console.log('Response text:', text);
      
      // Cek apakah respons berhasil
      if (!response.ok) {
        let errorMessage = 'Terjadi kesalahan';
        
        // Coba parse jika response adalah JSON
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || 'Terjadi kesalahan';
        } catch (e) {
          errorMessage = text || 'Terjadi kesalahan';
        }
        
        showErrorMessage(`Gagal menghapus kendaraan: ${errorMessage}`);
        return;
      }
      
      // Parse response jika ada
      let data = null;
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
        }
      }
      
      // Jika berhasil, perbarui state dengan menghapus kendaraan dari array
      const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== vehicleId);
      setVehicles(updatedVehicles);
      
      // Jika kendaraan yang dihapus adalah yang sedang dipilih, reset selectedVehicle
      if (selectedVehicle && selectedVehicle.id === vehicleId) {
        setSelectedVehicle(updatedVehicles.length > 0 ? updatedVehicles[0] : null);
      }
      
      // Success notification akan ditampilkan di SidebarComponent
      
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
        onDeleteVehicle={handleDeleteVehicle} // Tambahkan prop untuk hapus kendaraan
        onSetGeofence={handleSetGeofence} // TAMBAHAN: Prop untuk handle geofence
      />

      <div className="flex-grow">
        <MapComponent
          ref={mapRef}
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          isDrawingMode={isDrawingMode} // TAMBAHAN: Pass drawing mode ke map
          onPolygonComplete={handlePolygonComplete} // TAMBAHAN: Pass handler untuk polygon completion
          geofences={[]} // TAMBAHAN: Bisa diisi dengan existing geofences jika ada
        />
      </div>

      {/* Modal Tambah Kendaraan */}
      {showTambahModal && (
        <ModalTambahKendaraan
          onClose={() => setShowTambahModal(false)}
          onSucceed={handleTambahSukses}
        />
      )}

      {/* TAMBAHAN: Modal Set Geofence */}
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