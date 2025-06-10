// components/ModalSetGeofence.js - Modal untuk membuat geofence dengan pilihan kendaraan
'use client';

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { getCurrentUser } from "@/lib/authService";

/**
 * Modal untuk menambahkan dan mengatur geofence dengan wajib pilih kendaraan untuk single polygon
 */
const ModalSetGeofence = forwardRef(({ onClose, onSucceed, onStartDrawing, vehicles = [] }, ref) => {
  // State management
  const [formData, setFormData] = useState({
    name: "",
    type: "polygon",
    rule_type: "STAY_IN",
    status: "active",
    vehicle_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);
  const [error, setError] = useState("");

  // Handle perubahan input form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (e.target.name === 'vehicle_id') {
      setError(""); // Reset error saat kendaraan dipilih
    }
  };

  // Handle mulai drawing polygon atau multipolygon
  const handleStartDrawing = () => {
    if (!formData.name) {
      setError("Masukkan nama geofence terlebih dahulu!");
      return;
    }

    // Untuk single polygon, wajib pilih kendaraan terlebih dahulu
    if (formData.type === "polygon" && !formData.vehicle_id) {
      setError("Pilih kendaraan terlebih dahulu untuk membuat geofence!");
      return;
    }

    setError("");
    setIsDrawing(true);
    setPolygonCoordinates([]);
    
    // Pass multipolygon flag to parent
    const isMultiPolygon = formData.type === "multipolygon";
    onStartDrawing(true, isMultiPolygon);
  };

  // Function ini akan dipanggil dari parent saat polygon selesai digambar
  const handlePolygonComplete = (coordinates) => {
    setPolygonCoordinates(coordinates);
    setIsDrawing(false);
    onStartDrawing(false, false);
  };

  // Handle reset polygon
  const handleResetPolygon = () => {
    setPolygonCoordinates([]);
    setIsDrawing(false);
    setError("");
    onStartDrawing(false, false);
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
    setError("");

    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setError("User tidak terautentikasi. Silakan login kembali.");
      setLoading(false);
      return;
    }

    // Validasi form
    if (!formData.name) {
      setError("Nama geofence harus diisi!");
      setLoading(false);
      return;
    }

    // Untuk single polygon, wajib ada kendaraan yang dipilih
    if (formData.type === "polygon" && !formData.vehicle_id) {
      setError("Pilih kendaraan untuk geofence ini!");
      setLoading(false);
      return;
    }

    // Validasi coordinates berdasarkan tipe
    if (formData.type === "polygon") {
      if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3) {
        setError("Gambar area geofence terlebih dahulu! (minimal 3 titik)");
        setLoading(false);
        return;
      }
    } else if (formData.type === "multipolygon") {
      if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
        setError("Gambar area multipolygon terlebih dahulu!");
        setLoading(false);
        return;
      }
      
      // Validate each polygon in multipolygon
      const hasInvalidPolygon = polygonCoordinates.some(polygon => 
        !Array.isArray(polygon) || polygon.length < 3
      );
      
      if (hasInvalidPolygon) {
        setError("Setiap polygon dalam multipolygon harus memiliki minimal 3 titik!");
        setLoading(false);
        return;
      }
    }

    // Format coordinates berdasarkan tipe geofence
    let geometryType = "Polygon";
    let formattedCoordinates = [];

    if (formData.type === "polygon") {
      // Single polygon: convert [lat, lng] to [lng, lat] dan ensure closed
      const convertedCoords = polygonCoordinates.map(coord => [coord[1], coord[0]]);
      
      // Ensure polygon is closed
      if (convertedCoords.length > 0) {
        const firstPoint = convertedCoords[0];
        const lastPoint = convertedCoords[convertedCoords.length - 1];
        
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          convertedCoords.push([...firstPoint]);
        }
      }
      
      formattedCoordinates = [convertedCoords];
      geometryType = "Polygon";
    } else if (formData.type === "multipolygon") {
      // MultiPolygon: convert each polygon
      formattedCoordinates = polygonCoordinates.map(polygon => {
        const convertedCoords = polygon.map(coord => [coord[1], coord[0]]);
        
        // Ensure each polygon is closed
        if (convertedCoords.length > 0) {
          const firstPoint = convertedCoords[0];
          const lastPoint = convertedCoords[convertedCoords.length - 1];
          
          if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
            convertedCoords.push([...firstPoint]);
          }
        }
        
        return [convertedCoords]; // Wrap in array for polygon holes support
      });
      geometryType = "MultiPolygon";
    }

    // Format data untuk API
    const geofenceData = {
      name: formData.name,
      type: formData.type,
      definition: {
        type: geometryType,
        coordinates: formattedCoordinates
      },
      rule_type: formData.rule_type,
      status: formData.status,
      vehicle_id: formData.vehicle_id || null,
      user_id: currentUser.userId,
      date_created: new Date().toISOString()
    };

    // Kirim data ke API
    fetch("/api/TambahGeofence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geofenceData),
    })
      .then(async (res) => {
        const responseText = await res.text();
        
        if (!res.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            errorData = { message: responseText };
          }
          throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        try {
          return JSON.parse(responseText);
        } catch (e) {
          throw new Error("Invalid JSON response");
        }
      })
      .then((data) => {
        const selectedVehicle = vehicles.find(v => v.vehicle_id === formData.vehicle_id);
        const vehicleName = selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.license_plate})` : formData.vehicle_id;
        
        setSuccessMessage(
          `Geofence "${formData.name}" untuk kendaraan ${vehicleName} berhasil dibuat!`
        );
        
        // Tunggu 1 detik sebelum menutup modal
        setTimeout(() => {
          onSucceed();
        }, 1000);
      })
      .catch((err) => {
        console.error("Error membuat geofence:", err);
        setError(`Gagal membuat geofence: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Helper untuk mendapatkan nama kendaraan yang dipilih
  const getSelectedVehicleName = () => {
    const selectedVehicle = vehicles.find(v => v.vehicle_id === formData.vehicle_id);
    return selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.license_plate})` : "";
  };

  // Helper untuk menghitung jumlah polygon
  const getPolygonCount = () => {
    if (formData.type === "polygon") {
      return polygonCoordinates.length >= 3 ? 1 : 0;
    } else if (formData.type === "multipolygon") {
      return Array.isArray(polygonCoordinates) ? polygonCoordinates.length : 0;
    }
    return 0;
  };

  // Helper untuk menghitung total titik
  const getTotalPoints = () => {
    if (formData.type === "polygon") {
      return polygonCoordinates.length;
    } else if (formData.type === "multipolygon") {
      return Array.isArray(polygonCoordinates) 
        ? polygonCoordinates.reduce((total, polygon) => total + polygon.length, 0)
        : 0;
    }
    return 0;
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

        {/* Pesan error */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
            ❌ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Input nama geofence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Geofence
            </label>
            <input
              type="text"
              name="name"
              placeholder="Nama Geofence"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              disabled={isDrawing}
            />
          </div>

          {/* Select type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Geofence
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              disabled={isDrawing || polygonCoordinates.length > 0}
            >
              <option value="polygon">Polygon (Area Tunggal)</option>
              <option value="multipolygon">Multipolygon (Multiple Area)</option>
            </select>
            {formData.type === "multipolygon" && (
              <p className="text-xs text-gray-500 mt-1">
                Multipolygon memungkinkan Anda membuat beberapa area geofence dalam satu definisi
              </p>
            )}
          </div>

          {/* Select kendaraan - WAJIB untuk single polygon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === "polygon" ? "Pilih Kendaraan" : "Pilih Kendaraan (Opsional)"}
            </label>
            <select
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleChange}
              className={`w-full border p-2 rounded ${
                formData.type === "polygon" && !formData.vehicle_id ? 'border-red-500' : ''
              }`}
              disabled={isDrawing}
              required={formData.type === "polygon"}
            >
              <option value="">
                {vehicles.length > 0 ? "-- Pilih Kendaraan --" : "Tidak ada kendaraan tersedia"}
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.name} ({vehicle.license_plate}) - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
            {formData.type === "polygon" && !formData.vehicle_id && (
              <p className="text-xs text-red-500 mt-1">
                * Wajib pilih kendaraan untuk geofence single polygon
              </p>
            )}

          </div>

          {/* Select rule_type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Aturan
            </label>
            <select
              name="rule_type"
              value={formData.rule_type}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              disabled={isDrawing}
            >
              <option value="STAY_IN">Stay In (Harus tetap di dalam area)</option>
              <option value="FORBIDDEN">Forbidden (Area terlarang)</option>
            </select>
          </div>

          {/* Select status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              disabled={isDrawing}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Status drawing */}
          {(isDrawing || polygonCoordinates.length > 0) && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Status Drawing:</p>
              <p className="text-xs text-blue-600">
                Polygon: {getPolygonCount()} | Total Titik: {getTotalPoints()}
              </p>
              {formData.vehicle_id && (
                <p className="text-xs text-green-600">
                  Untuk kendaraan: {getSelectedVehicleName()}
                </p>
              )}
              {isDrawing && (
                <p className="text-xs text-blue-600 mt-1">
                  {formData.type === "multipolygon" 
                    ? "Klik kiri untuk titik, klik kanan untuk selesai polygon. Klik 'Finish' untuk selesai multipolygon."
                    : "Klik kiri untuk titik, klik kanan untuk selesai polygon."
                  }
                </p>
              )}
            </div>
          )}

          {/* Tombol-tombol aksi */}
          <div className="flex gap-2">
            {!isDrawing ? (
              <>
                {/* Tombol Batal */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors duration-200"
                  disabled={loading}
                >
                  Batal
                </button>
                
                {/* Tombol Gambar Area */}
                <button
                  type="button"
                  onClick={handleStartDrawing}
                  className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors duration-200 disabled:bg-gray-400"
                  disabled={loading || (formData.type === "polygon" && !formData.vehicle_id)}
                >
                  Gambar Area {formData.type === "multipolygon" ? "Multipolygon" : "Polygon"}
                </button>
                
                {/* Tombol Simpan - muncul setelah polygon digambar */}
                {polygonCoordinates.length > 0 && (
                  <button
                    type="submit"
                    disabled={loading || (formData.type === "polygon" && !formData.vehicle_id)}
                    className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {loading ? "Menyimpan..." : "Simpan"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleResetPolygon}
                className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Batal Gambar
              </button>
            )}
          </div>

          {/* Reset coordinates button */}
          {!isDrawing && polygonCoordinates.length > 0 && (
            <button
              type="button"
              onClick={handleResetPolygon}
              className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 text-sm"
            >
              Reset Area yang Digambar
            </button>
          )}
        </form>
      </div>
    </div>
  );
});

ModalSetGeofence.displayName = 'ModalSetGeofence';

export default ModalSetGeofence;