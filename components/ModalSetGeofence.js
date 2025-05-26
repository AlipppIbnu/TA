// components/ModalSetGeofence.js - Modal untuk menggambar dan menyimpan geofence
'use client';

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";

/**
 * Modal untuk menambahkan dan mengatur geofence
 */
const ModalSetGeofence = forwardRef(({ onClose, onSucceed, onStartDrawing }, ref) => {
  // State management
  const [formData, setFormData] = useState({
    kota: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);

  // Handle perubahan input form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle mulai drawing polygon
  const handleStartDrawing = () => {
    if (!formData.kota) {
      alert("Masukkan nama kota/area terlebih dahulu!");
      return;
    }
    setIsDrawing(true);
    setPolygonCoordinates([]);
    onStartDrawing(true);
  };

  // Function ini akan dipanggil dari parent saat polygon selesai digambar
  const handlePolygonComplete = (coordinates) => {
    console.log('Received polygon coordinates:', coordinates);
    setPolygonCoordinates(coordinates);
    setIsDrawing(false);
    onStartDrawing(false);
  };

  // Handle reset polygon
  const handleResetPolygon = () => {
    setPolygonCoordinates([]);
    setIsDrawing(false);
    onStartDrawing(false);
  };

  // Expose handlePolygonComplete ke parent
  useImperativeHandle(ref, () => ({
    handlePolygonComplete
  }));

  // Validasi dan kirim data ke API
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");

    // Validasi form
    if (!formData.kota) {
      alert("Nama kota/area harus diisi!");
      setLoading(false);
      return;
    }

    if (polygonCoordinates.length < 3) {
      alert("Gambar area geofence terlebih dahulu! (minimal 3 titik)");
      setLoading(false);
      return;
    }

    // Format data untuk Directus sesuai format yang diharapkan
    const geofenceData = {
      kota: formData.kota,
      geofencing: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            // Convert [lat, lng] ke [lng, lat] untuk GeoJSON format
            polygonCoordinates.map(coord => [coord[1], coord[0]])
          ]
        },
        properties: {
          name: formData.kota,
          created_at: new Date().toISOString()
        }
      }
    };

    console.log("Mengirim data geofence:", geofenceData);

    // Kirim data ke API
    fetch("/api/TambahGeofence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geofenceData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((errorData) => {
            throw new Error(errorData.message || res.statusText);
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Geofence berhasil dibuat:", data);
        setSuccessMessage(`Geofence "${formData.kota}" berhasil dibuat!`);
        
        // Tunggu 1 detik sebelum menutup modal
        setTimeout(() => {
          onSucceed();
        }, 1000);
      })
      .catch((err) => {
        console.error("❌ Error membuat geofence:", err);
        alert(`Gagal membuat geofence: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{
        background: isDrawing ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
        pointerEvents: isDrawing ? 'none' : 'auto'
      }}
    >
      <div 
        className={`bg-white p-8 rounded-md shadow-lg max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          isDrawing 
            ? 'fixed top-4 right-4 w-80 z-[60]'
            : 'relative max-w-md mx-auto mt-20'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <h2 className="text-xl font-bold mb-4">Set Geofence</h2>
        
        {/* Pesan sukses */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md border border-green-300">
            ✅ {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Input nama kota/area */}
          <input
            type="text"
            name="kota"
            placeholder="Nama Kota/Area"
            value={formData.kota}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            autoComplete="off"
            required
            disabled={isDrawing}
          />

          {/* Area geofence */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Area Geofence</h3>
            
            {/* Status: Belum digambar */}
            {!isDrawing && polygonCoordinates.length === 0 && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleStartDrawing}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  Gambar Area Geofence
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Klik tombol untuk mulai menggambar area geofence di peta
                </p>
              </div>
            )}

            {/* Status: Sedang menggambar */}
            {isDrawing && (
              <div className="text-center">
                <p className="text-blue-600 font-semibold mb-2">
                  Mode Drawing Aktif
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>klik kiri </strong> di peta untuk menambah titik.<br/>
                  <strong>klik kanan </strong> untuk menyelesaikan.
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Titik saat ini: {polygonCoordinates.length} (min 3 titik)
                </p>
                <button
                  type="button"
                  onClick={handleResetPolygon}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Batal Drawing
                </button>
              </div>
            )}

            {/* Status: Sudah digambar */}
            {polygonCoordinates.length > 0 && !isDrawing && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-green-600 font-semibold mb-2">
                  ✅ Area geofence sudah digambar
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Jumlah titik: {polygonCoordinates.length}
                </p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleStartDrawing}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Edit Area
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPolygon}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Hapus Area
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tombol aksi */}
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              disabled={loading || isDrawing}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || polygonCoordinates.length < 3 || isDrawing}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Geofence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

ModalSetGeofence.displayName = 'ModalSetGeofence';

export default ModalSetGeofence;