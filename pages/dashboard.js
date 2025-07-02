// pages/Dashboard.js - Halaman dashboard utama dengan peta interaktif
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
import UserDropdown from '@/components/UserDropdown';

// Import dinamis untuk MapComponent (tanpa SSR)
const MapComponent = dynamic(() => import("../components/MapComponent"), { ssr: false });

// Modal Tambah Kendaraan - komponen modal untuk menambah kendaraan baru
function ModalTambahKendaraan({ onClose, onSucceed }) {
  // State untuk data form
  const [formData, setFormData] = useState({
    license_plate: "",
    name: "",
    make: "",
    model: "",
    year: "",
    sim_card_number: "",
    gps_id: ""
  });
  
  // State untuk loading dan pesan
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isCheckingGps, setIsCheckingGps] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [licensePlateError, setLicensePlateError] = useState("");

  // Fungsi untuk menangani perubahan input form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset pesan error ketika user mengetik
    if (name === 'gps_id') {
      setGpsError('');
    }
    if (name === 'license_plate') {
      setLicensePlateError('');
    }
    setError('');
  };

  // Fungsi untuk memeriksa nomor plat kendaraan
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
      console.error('Error memeriksa nomor plat:', err);
      setLicensePlateError('Gagal memeriksa nomor plat');
      return false;
    }
  };

  // Fungsi untuk memeriksa GPS device ID
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
      console.error('Error memeriksa GPS device ID:', err);
      setGpsError('Gagal memeriksa GPS Device ID');
      return false;
    } finally {
      setIsCheckingGps(false);
    }
  };

  // Validasi dan kirim data ke API 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
  
    try {
      // Validasi form
      if (!formData.license_plate || !formData.name || 
          !formData.make || !formData.model || !formData.year) {
        throw new Error("Mohon isi semua field yang wajib!");
      }

      // Validasi nomor plat
      const isLicensePlateAvailable = await checkLicensePlate(formData.license_plate);
      if (!isLicensePlateAvailable) {
        setLoading(false);
        return;
      }

      // Validasi GPS device ID jika diisi
      if (formData.gps_id) {
        const isGpsAvailable = await checkGpsDeviceId(formData.gps_id);
        if (!isGpsAvailable) {
          setLoading(false);
          return;
        }
      }

      // Tambah kendaraan melalui API
      const newVehicle = await addVehicle(formData);
      
      setSuccessMessage(`Kendaraan ${formData.make} ${formData.model} berhasil ditambahkan!`);
        
      // Tunggu 1 detik sebelum menutup modal
      setTimeout(() => {
        onSucceed(newVehicle); // Kirim data kendaraan baru ke parent
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
        {/* Header modal */}
        <div className="px-4 py-3 border-b border-black">
          <h2 className="text-base font-semibold">Tambah Kendaraan Baru</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3 space-y-3">
            {/* Field nomor plat */}
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
          
            {/* Field nama kendaraan */}
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
          
            {/* Field merek */}
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
          
            {/* Field model */}
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
          
            {/* Field tahun */}
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

            {/* Field nomor SIM Card */}
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
          
            {/* Field GPS Device ID */}
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

            {/* Pesan sukses */}
            {successMessage && (
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                {successMessage}
              </div>
            )}

            {/* Pesan error */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Footer dengan tombol */}
          <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || isCheckingGps}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  
  // Referensi komponen
  const mapRef = useRef(null);
  const geofenceModalRef = useRef(null);

  // Hook notifikasi geofence dengan deteksi real-time
  const {
    notifications: geofenceNotifications,
    removeNotification: removeGeofenceNotification,
    removeAllNotifications: removeAllGeofenceNotifications,
    checkVehicleGeofenceViolations
  } = useGeofenceNotifications(10000); // Otomatis hapus setelah 10 detik

  // Hook WebSocket untuk update GPS real-time
  const { data: wsData, isConnected, getConnectionStats } = useWebSocket();

  // State untuk user dan loading
  const [loading, setLoading] = useState(true);
  
  // State untuk kendaraan (harus didefinisikan sebelum updatedVehicles)
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Gabungkan data kendaraan dengan data GPS real-time dari WebSocket
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
            return {
              ...vehicle,
              position: {
                lat: newLat,
                lng: newLng,
                timestamp: update.timestamp,
                speed: update.speed || 0,
                ignition_status: update.ignition_status,
                battery_level: update.battery_level,
                fuel_level: update.fuel_level,
                isRealTimeUpdate: true // Flag untuk menandai data dari WebSocket
              }
            };
          }
        }
        
        return vehicle;
      });
    }
    
    return result;
  }, [vehicles, wsData, isConnected]);
  
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

  // State untuk UI
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Muat data user dan kendaraan
  useEffect(() => {
    const loadUserAndVehicles = async () => {
      try {
        // Periksa apakah pengguna sudah terotentikasi
        if (!isAuthenticated()) {
          router.push("/login");
          return;
        }

        // Dapatkan data pengguna saat ini
        const userData = getCurrentUser();
        if (!userData) {
          router.push("/login");
          return;
        }

        // Muat kendaraan untuk pengguna saat ini
        const userVehicles = await getUserVehicles();
        
        setVehicles(userVehicles);
        if (userVehicles.length > 0) {
          setSelectedVehicle(userVehicles[0]);
        }

        // Muat geofences
        await loadGeofences();
      } catch (error) {
        console.error('Error memuat data:', error);
        setErrorMessage('Gagal memuat data kendaraan');
        setShowErrorAlert(true);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndVehicles();
  }, [router]);

  // Refresh data awal saat WebSocket belum terhubung untuk mengurangi delay startup
  useEffect(() => {
    if (!isConnected && vehicles.length > 0) {
      const fetchFreshData = async () => {
        try {
          const userVehicles = await getUserVehicles();
          setVehicles(userVehicles);
        } catch (error) {
          console.error('Error mengambil data fresh kendaraan saat startup:', error);
        }
      };
      
      // Delay sedikit untuk memberi kesempatan WebSocket terhubung
      const timeout = setTimeout(fetchFreshData, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, vehicles.length]);

  // Muat geofences dari API
  const loadGeofences = async () => {
    try {
      const response = await fetch('/api/geofences');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data geofences');
      }

      const data = await response.json();
      
      if (data.success) {
        const geofencesData = data.data || [];
        setGeofences(geofencesData);
      } else {
        throw new Error(data.message || 'Gagal memuat geofences');
      }
    } catch (error) {
      console.error('Error memuat geofences:', error);
      setGeofences([]);
      // Jangan tampilkan alert error untuk geofences karena tidak kritis untuk fungsi dashboard
    }
  };

  // Monitor untuk reload posisi kendaraan secara berkala (fallback ketika WebSocket tidak terhubung)
  useEffect(() => {
    const reloadVehiclePositions = async () => {
      try {
        // Hanya reload jika WebSocket tidak terhubung untuk menghemat bandwidth
        if (!isConnected) {
          const userVehicles = await getUserVehicles();
          setVehicles(userVehicles);
          
          // Update kendaraan terpilih jika ada dalam data baru
          if (selectedVehicle) {
            const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
            if (updatedSelectedVehicle) {
              setSelectedVehicle(prev => ({
                ...updatedSelectedVehicle,
                path: prev.path // Pertahankan path yang ada jika ada
              }));
            }
          }
        }

      } catch (error) {
        console.error('Error reload posisi kendaraan:', error);
      }
    };

    // Jika WebSocket terhubung, interval lebih jarang (10 detik)
    // Jika WebSocket tidak terhubung, interval lebih sering (3 detik)
    const interval = isConnected ? 10000 : 3000;
    
    const positionInterval = setInterval(reloadVehiclePositions, interval);

    return () => clearInterval(positionInterval);
  }, [isConnected, selectedVehicle]);

  // Monitor status koneksi WebSocket
  useEffect(() => {
    // Removed verbose logging for production
  }, [isConnected]);

  // Monitor notifikasi geofence untuk produksi
  useEffect(() => {
    // Removed verbose logging for production  
  }, [geofenceNotifications]);

  // Fungsi untuk menampilkan pesan error
  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage('');
  };

  const handleHistoryClick = async (vehicleId, startDate, endDate) => {
    try {
      // Cari kendaraan dalam data terbaru (updatedVehicles)
      const existingVehicle = updatedVehicles.find(v => v.vehicle_id === vehicleId);
      
      if (!existingVehicle) {
        showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
        return;
      }

      // Periksa apakah gps_id ada
      if (!existingVehicle.gps_id) {
        showErrorMessage(`Kendaraan ${existingVehicle.name} belum memiliki GPS ID. Tidak bisa menampilkan history.`);
        return;
      }

      // Gunakan API history yang khusus
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

      // Data sudah difilter di API, tinggal transform ke format yang dibutuhkan map
      const pathCoords = data.data.map(coord => ({
        lat: parseFloat(coord.latitude),
        lng: parseFloat(coord.longitude),
        timestamp: coord.timestamp
      }));

      // Gunakan existingVehicle yang sudah diverifikasi
      setSelectedVehicle({
        ...existingVehicle,
        path: pathCoords
      });

    } catch (err) {
      console.error("Gagal ambil riwayat koordinat:", err);
      showErrorMessage("Gagal memuat riwayat kendaraan: " + err.message);
    }
  };

  // Fungsi untuk menangani pemilihan kendaraan dari sidebar
  const handleSelectVehicle = (vehicle) => {
    // Tangani null vehicle (ketika deselecting)
    if (!vehicle) {
      setSelectedVehicle(null);
      return;
    }
    
    // Pastikan kendaraan masih ada dalam daftar sebelum memilihnya
    const existingVehicle = vehicles.find(v => v.vehicle_id === vehicle.vehicle_id);
    if (!existingVehicle) {
      showErrorMessage("Kendaraan tidak ditemukan atau telah dihapus");
      return;
    }
    setSelectedVehicle(existingVehicle);
  };

  // Fungsi untuk menyembunyikan history
  const handleHideHistory = () => {
    if (selectedVehicle) {
      // Hapus path untuk menyembunyikan garis history
      setSelectedVehicle({
        ...selectedVehicle,
        path: undefined
      });
    }
  };

  // Fungsi untuk menampilkan modal tambah kendaraan
  const handleTambahKendaraan = () => {
    setShowTambahModal(true);
  };

  // Fungsi untuk ketika kendaraan berhasil ditambah
  const handleTambahSukses = (newVehicle) => {
    // Tambah kendaraan baru ke state vehicles
    setVehicles(prevVehicles => [...prevVehicles, {
      ...newVehicle,
      position: null // Set posisi awal sebagai null
    }]);
    
    // Tutup modal
    setShowTambahModal(false);
  };

  // Handler untuk SET GEOFENCE
  const handleSetGeofence = () => {
    // Cek apakah ada kendaraan tersedia
    if (vehicles.length === 0) {
      setErrorMessage('Tidak ada kendaraan tersedia! Tambahkan kendaraan terlebih dahulu.');
      setShowErrorAlert(true);
      return;
    }
    
    setShowGeofenceModal(true);
  };

  // Handler untuk mode drawing
  const handleStartDrawing = (start = true, type = 'polygon') => {
    setIsDrawingMode(start);
    setDrawingType(type);
  };

  // Handler untuk penyelesaian polygon
  const handlePolygonComplete = (coordinates) => {
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handlePolygonComplete(coordinates);
    }
  };

  // Handler untuk penyelesaian circle
  const handleCircleComplete = (circleData) => {
    if (geofenceModalRef.current) {
      geofenceModalRef.current.handleCircleComplete(circleData);
    }
  };

  // Handler untuk ketika geofence berhasil dibuat
  const handleGeofenceSukses = async () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setDrawingType('polygon');
    
    try {
      // Reload both geofences DAN vehicles (karena vehicle.geofence_id berubah)
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          setVehicles(userVehicles);
          // Update kendaraan terpilih jika ada dalam data baru
          if (selectedVehicle) {
            const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
            if (updatedSelectedVehicle) {
              setSelectedVehicle(updatedSelectedVehicle);
            }
          }
        })
      ]);
    } catch (error) {
      console.error("Error refresh data setelah pembuatan geofence:", error);
    }
  };

  // Handler untuk ketika geofence berhasil dihapus
  const handleGeofenceDeleted = async () => {
    try {
      // Reload both geofences DAN vehicles (karena vehicle.geofence_id mungkin berubah)
      await Promise.all([
        loadGeofences(),
        getUserVehicles().then(userVehicles => {
          setVehicles(userVehicles);
          // Update kendaraan terpilih jika ada dalam data baru
          if (selectedVehicle) {
            const updatedSelectedVehicle = userVehicles.find(v => v.vehicle_id === selectedVehicle.vehicle_id);
            if (updatedSelectedVehicle) {
              setSelectedVehicle(updatedSelectedVehicle);
            }
          }
        })
      ]);
    } catch (error) {
      console.error("Error refresh data setelah penghapusan geofence:", error);
    }
  };

  // Handler untuk menutup modal geofence
  const handleCloseGeofenceModal = () => {
    setShowGeofenceModal(false);
    setIsDrawingMode(false);
    setDrawingType('polygon');
  };

  // Handler untuk toggle visibilitas geofence
  const handleToggleGeofence = (vehicleId, isVisible) => {
    setVehicleGeofenceVisibility(prev => ({
      ...prev,
      [vehicleId]: isVisible
    }));
  };

  // Filter geofences berdasarkan visibilitas (Pendekatan Vehicle-Centric)
  const getVisibleGeofences = () => {
    const filtered = geofences.filter(geofence => {
      // Cari kendaraan yang menggunakan geofence ini (gunakan updatedVehicles untuk data terbaru)
      const vehicleUsingThisGeofence = updatedVehicles.find(vehicle => 
        vehicle.geofence_id === geofence.geofence_id
      );
      
      // Jika tidak ada kendaraan yang menggunakan geofence ini, skip
      if (!vehicleUsingThisGeofence) {
        return false;
      }
      
      // Cek apakah visibilitas untuk kendaraan tersebut aktif
      const vehicleIdStr = String(vehicleUsingThisGeofence.vehicle_id);
      const isVisible = vehicleGeofenceVisibility[vehicleIdStr] === true;
      
      return isVisible;
    });
    
    return filtered;
  };

  // Fungsi untuk menghapus kendaraan
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
      
      // Update state lokal setelah penghapusan berhasil
      const filteredVehicles = vehicles.filter(vehicle => vehicle.vehicle_id !== vehicleId);
      setVehicles(filteredVehicles);
      
      // Update kendaraan terpilih jika diperlukan
      if (selectedVehicle && selectedVehicle.vehicle_id === vehicleId) {
        setSelectedVehicle(filteredVehicles.length > 0 ? filteredVehicles[0] : null);
      }
      
      return true; // Return true untuk menandakan penghapusan berhasil
      
    } catch (error) {
      console.error('Error menghapus kendaraan:', error);
      throw error; // Re-throw error untuk ditangani oleh pemanggil
    }
  };

  // Tampilkan loading screen
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm font-medium">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-full bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
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
      />
      </aside>

      {/* Main Content - disesuaikan dengan sidebar yang lebih compact */}
      <main
        className={`transition-all duration-300 ease-in-out lg:ml-64 flex flex-col h-screen`}
      >
        {/* Header */}
        {!isDrawingMode && (
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 lg:left-64 z-[2000]">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Page Title */}
              <h1 className="text-lg font-semibold text-gray-900">VehiTrack Dashboard</h1>
              
              {/* WebSocket Connection Status Indicator */}
              <div className="ml-3 flex items-center">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`ml-1 text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Real-time' : 'Offline'}
                </span>
              </div>
            </div>
            
            {/* Notification Icon and User Dropdown */}
            <div className="flex items-center gap-3">
              {/* Notification Icon */}
              <button
                onClick={() => router.push('/notifications')}
                className="notification-btn relative"
                title="Riwayat Notifikasi"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>
            
            {/* User Dropdown */}
            <UserDropdown />
            </div>
          </div>
        </header>
        )}

                 {/* Map Container */}
         <div className={`relative w-full ${
           isDrawingMode ? 'flex-1' : 'flex-1'
         }`}>

          {/* Map */}
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

          {/* Geofence Notifications - positioned on the right */}
          <div className={`fixed right-4 z-[9999] space-y-1.5 max-w-[220px] w-full transition-all duration-300 ${
            isDrawingMode ? 'top-8' : 'top-24'
          }`}>
            {geofenceNotifications.map((notification) => (
              <GeofenceNotification
                key={notification.id}
                notification={notification}
                onRemove={removeGeofenceNotification}
                autoRemoveDelay={10000}
              />
            ))}
            
            {/* Dismiss All Button - only show if there are multiple notifications */}
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

          {/* Geofence Modal */}
          {showGeofenceModal && (
            <ModalSetGeofence
              ref={geofenceModalRef}
              onClose={handleCloseGeofenceModal}
              onSucceed={handleGeofenceSukses}
              onStartDrawing={handleStartDrawing}
              vehicles={updatedVehicles}
              selectedVehicle={selectedVehicle}
            />
          )}
        </div>

      {/* Modal Tambah Kendaraan */}
      {showTambahModal && (
        <ModalTambahKendaraan
          onClose={() => setShowTambahModal(false)}
          onSucceed={handleTambahSukses}
        />
      )}

      {/* Error Alert - dikecilkan */}
      {showErrorAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm">
            <h3 className="text-base font-bold mb-3 text-red-500 text-center">Tidak Ada Data History</h3>
            <p className="mb-3 text-center text-sm">
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
          className="toast-container"
          toastClassName="toast-item"
        />
      </main>
    </div>
  );
}

// Ambil data kendaraan + posisi terakhir
export async function getServerSideProps() {
  try {
    // Tambahkan timeout untuk request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Fetch vehicles and their latest coordinates using directusConfig
    const [resVehicles, resVehicleData] = await Promise.all([
      fetch(`${directusConfig.baseURL}/items/vehicle`, {
        signal: controller.signal,
        headers: directusConfig.headers
      }),
      fetch(`${directusConfig.baseURL}/items/vehicle_datas?sort=-timestamp&limit=1000`, {
        signal: controller.signal,
        headers: directusConfig.headers
      })
    ]);
    
    clearTimeout(timeoutId);

    if (!resVehicles.ok || !resVehicleData.ok) {
      console.error("Fetch failed:", { 
        vehiclesStatus: resVehicles.status, 
        vehicleDataStatus: resVehicleData.status 
      });
      throw new Error("Gagal fetch dari Directus.");
    }

    const vehiclesData = await resVehicles.json();
    const vehicleDataResponse = await resVehicleData.json();

    // Group vehicle_datas by gps_id and get latest position
    const latestPositions = {};
    vehicleDataResponse.data.forEach(data => {
      if (!data.gps_id) {
        console.warn("Vehicle data without gps_id:", data);
        return;
      }
      
      if (!latestPositions[data.gps_id] || new Date(data.timestamp) > new Date(latestPositions[data.gps_id].timestamp)) {
        latestPositions[data.gps_id] = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          timestamp: data.timestamp
        };
      }
    });

    // Combine vehicle data with their latest positions using gps_id
    const vehicles = vehiclesData.data.map(vehicle => {
      const position = latestPositions[vehicle.gps_id] || null;
      
      return {
      ...vehicle,
        position
      };
    });

    return { props: { vehicles } };
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