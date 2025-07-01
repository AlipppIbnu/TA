// components/ModalSetGeofence.js - Modal untuk membuat geofence dengan pilihan kendaraan
'use client';

import { useState, forwardRef, useImperativeHandle } from "react";
import { getCurrentUser } from "@/lib/authService";

/**
 * Modal untuk menambahkan dan mengatur geofence dengan pilihan kendaraan
 */
const ModalSetGeofence = forwardRef(({ onClose, onSucceed, onStartDrawing, vehicles = [] }, ref) => {
  // State management
  const [formData, setFormData] = useState({
    name: "",
    type: "polygon",
    rule_type: "STAY_IN",
    vehicle_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);
  const [circleData, setCircleData] = useState({ center: null, radius: 0 });
  const [error, setError] = useState("");

  // Handle perubahan input form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (e.target.name === 'vehicle_id') {
      setError(""); // Reset error saat kendaraan dipilih
    }
  };

  // Handle mulai drawing polygon atau circle
  const handleStartDrawing = () => {
    if (!formData.name) {
      setError("Masukkan nama geofence terlebih dahulu!");
      return;
    }

    // Wajib pilih kendaraan terlebih dahulu
    if (!formData.vehicle_id) {
      setError("Pilih kendaraan terlebih dahulu untuk membuat geofence!");
      return;
    }

    setError("");
    setIsDrawing(true);
    setPolygonCoordinates([]);
    setCircleData({ center: null, radius: 0 });
    
    // Pass drawing type to parent
    onStartDrawing(true, formData.type);
  };

  // Function ini akan dipanggil dari parent saat polygon/circle selesai digambar
  const handlePolygonComplete = (coordinates) => {
    if (formData.type === "polygon") {
      setPolygonCoordinates(coordinates);
    } else if (formData.type === "circle") {
      setCircleData(coordinates);
    }
    setIsDrawing(false);
    onStartDrawing(false, false);
  };

  // Handle reset area
  const handleResetArea = () => {
    setPolygonCoordinates([]);
    setCircleData({ center: null, radius: 0 });
    setIsDrawing(false);
    setError("");
    onStartDrawing(false, false);
  };

  // Function untuk circle completion
  const handleCircleComplete = (circleData) => {
    if (formData.type === "circle") {
      setCircleData(circleData);
    }
    setIsDrawing(false);
    onStartDrawing(false, false);
  };

  // Expose methods ke parent
  useImperativeHandle(ref, () => ({
    handlePolygonComplete,
    handleCircleComplete
  }));

  // Validasi dan kirim data ke API
  const handleSubmit = async (e) => {
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

    // Wajib ada kendaraan yang dipilih
    if (!formData.vehicle_id) {
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
    } else if (formData.type === "circle") {
      if (!circleData.center || circleData.radius <= 0) {
        setError("Gambar area circle terlebih dahulu!");
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
    } else if (formData.type === "circle") {
      // Circle: convert to polygon for GeoJSON compatibility
      geometryType = "Polygon";
      
      // Validate circle data structure
      if (!circleData || !circleData.center || circleData.radius === undefined) {
        setError("Data circle tidak valid. Silakan gambar circle ulang.");
        setLoading(false);
        return;
      }
      
      // Handle Leaflet LatLng object or plain object
      let centerLng, centerLat;
      
      if (typeof circleData.center === 'object') {
        // Handle both Leaflet LatLng object and plain object
        centerLng = circleData.center.lng !== undefined ? circleData.center.lng : 
                   (circleData.center.lon !== undefined ? circleData.center.lon : null);
        centerLat = circleData.center.lat !== undefined ? circleData.center.lat : null;
      }
      
      if (centerLng === null || centerLat === null) {
        setError("Koordinat center circle tidak valid. Silakan gambar circle ulang.");
        setLoading(false);
        return;
      }
      
      // Convert circle to polygon (create points around circumference)
      const radiusInDegrees = circleData.radius / 111000; // Rough conversion: 1 degree ≈ 111km
      const points = [];
      const numPoints = 32; // Number of points to create the circle polygon
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const pointLng = centerLng + (radiusInDegrees * Math.cos(angle));
        const pointLat = centerLat + (radiusInDegrees * Math.sin(angle));
        points.push([pointLng, pointLat]);
      }
      
      // Close the polygon by adding the first point at the end
      points.push([...points[0]]);
      
      formattedCoordinates = [points];
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
      vehicle_id: formData.vehicle_id,
      user_id: currentUser.userId,
      date_created: new Date().toISOString()
    };

    // Kirim data ke API
    try {
      const response = await fetch("/api/TambahGeofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geofenceData),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse and ignore the response data since we only need success status

      // Success
      const selectedVehicle = vehicles.find(v => v.vehicle_id === formData.vehicle_id);
      const vehicleName = selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.license_plate})` : formData.vehicle_id;
      
      setSuccessMessage(
        `Geofence "${formData.name}" untuk kendaraan ${vehicleName} berhasil dibuat!`
      );
      
      // Tunggu 1 detik sebelum menutup modal
      setTimeout(() => {
        onSucceed();
      }, 1000);

    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(`Network error: ${err.message}. Periksa koneksi internet.`);
      } else {
        setError(`Gagal membuat geofence: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk menghitung status area
  const getAreaStatus = () => {
    if (formData.type === "polygon") {
      return polygonCoordinates.length >= 3 ? "Selesai" : `${polygonCoordinates.length} titik`;
    } else if (formData.type === "circle") {
      return circleData.center && circleData.radius > 0 ? "Selesai" : "Belum digambar";
    }
    return "Belum digambar";
  };

  // Helper untuk menghitung total titik/info
  const getAreaInfo = () => {
    if (formData.type === "polygon") {
      return `${polygonCoordinates.length} titik`;
    } else if (formData.type === "circle") {
      return circleData.radius > 0 ? `Radius: ${Math.round(circleData.radius)}m` : "Belum ada data";
    }
    return "Belum ada data";
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: isDrawing ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
        pointerEvents: isDrawing ? 'none' : 'auto'
      }}
    >
      <div 
        className={`bg-white p-4 rounded shadow-lg max-h-[90vh] overflow-y-auto ${
          isDrawing 
            ? 'fixed top-20 right-4 w-56 z-[10000]'
            : 'w-full max-w-xs'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <h2 className="text-lg font-bold mb-3">Set Geofence</h2>
        
        {/* Pesan sukses */}
        {successMessage && (
          <div className="mb-2 p-2 bg-green-100 text-green-700 rounded text-xs border border-green-300">
            ✅ {successMessage}
          </div>
        )}

        {/* Pesan error */}
        {error && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-xs border border-red-300">
            ❌ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          {/* Input nama geofence */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nama Geofence
            </label>
            <input
              type="text"
              name="name"
              placeholder="Nama Geofence"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-1.5 rounded text-sm"
              disabled={isDrawing}
            />
          </div>

          {/* Select type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipe Geofence
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border p-1.5 rounded text-sm"
              disabled={isDrawing || polygonCoordinates.length > 0 || (circleData.center && circleData.radius > 0)}
            >
              <option value="polygon">Polygon (Area Berbentuk Poligon)</option>
              <option value="circle">Circle (Area Berbentuk Lingkaran)</option>
            </select>
            <p className="text-xs text-gray-500 mt-0.5">
              {formData.type === "polygon" 
                ? "Polygon memungkinkan Anda membuat area dengan bentuk bebas"
                : "Circle memungkinkan Anda membuat area berbentuk lingkaran dengan radius tertentu"
              }
            </p>
          </div>

          {/* Select kendaraan - WAJIB */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pilih Kendaraan
            </label>
            <select
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleChange}
              className={`w-full border p-1.5 rounded text-sm ${
                !formData.vehicle_id ? 'border-red-500' : ''
              }`}
              disabled={isDrawing}
              required
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
            {!formData.vehicle_id && (
              <p className="text-xs text-red-500 mt-0.5">
                * Wajib pilih kendaraan untuk geofence
              </p>
            )}
          </div>

          {/* Select rule_type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipe Aturan
            </label>
            <select
              name="rule_type"
              value={formData.rule_type}
              onChange={handleChange}
              className="w-full border p-1.5 rounded text-sm"
              disabled={isDrawing}
            >
              <option value="STAY_IN">Stay In (Harus tetap di dalam area)</option>
              <option value="FORBIDDEN">Forbidden (Area terlarang)</option>
            </select>
          </div>

          {/* Status drawing */}
          {(isDrawing || polygonCoordinates.length > 0 || (circleData.center && circleData.radius > 0)) && (
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-medium text-blue-800">Status Drawing:</p>
              <p className="text-xs text-blue-600">
                Status: {getAreaStatus()} | {getAreaInfo()}
              </p>
             
              {isDrawing && (
                <p className="text-xs text-blue-600 mt-0.5">
                  {formData.type === "polygon" 
                    ? "Klik kiri untuk titik, klik kanan untuk selesai polygon (min 3 titik)."
                    : "Klik kiri pertama untuk center, klik kiri kedua untuk menentukan radius circle."
                  }
                </p>
              )}
            </div>
          )}

          {/* Tombol-tombol aksi */}
          <div className="flex gap-1">
            {!isDrawing ? (
              <>
                {/* Tombol Batal */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors duration-200 text-sm"
                  disabled={loading}
                >
                  Batal
                </button>
                
                {/* Tombol Gambar Area */}
                <button
                  type="button"
                  onClick={handleStartDrawing}
                  className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors duration-200 disabled:bg-gray-400 text-sm"
                  disabled={loading || !formData.vehicle_id}
                >
                  Gambar {formData.type === "circle" ? "Circle" : "Polygon"}
                </button>
                
                {/* Tombol Simpan - muncul setelah area digambar */}
                {((formData.type === "polygon" && polygonCoordinates.length > 0) || 
                  (formData.type === "circle" && circleData.center && circleData.radius > 0)) && (
                  <button
                    type="submit"
                    disabled={loading || !formData.vehicle_id}
                    className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400 text-sm"
                  >
                    {loading ? "Menyimpan..." : "Simpan"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleResetArea}
                className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 text-sm"
              >
                Batal Gambar
              </button>
            )}
          </div>

          {/* Reset area button */}
          {!isDrawing && ((formData.type === "polygon" && polygonCoordinates.length > 0) || 
            (formData.type === "circle" && circleData.center && circleData.radius > 0)) && (
            <button
              type="button"
              onClick={handleResetArea}
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