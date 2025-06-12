//Tambah Kendaraan
'use client';

import { useState } from "react";
import { addVehicle } from "../lib/vehicleService";

export default function ModalTambahKendaraan({ onClose, onSucceed }) {
  // State untuk form data
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

  // Handle perubahan input form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset error messages when user types
    if (name === 'gps_id') {
      setGpsError('');
    }
    if (name === 'license_plate') {
      setLicensePlateError('');
    }
    setError('');
  };

  // Fungsi untuk memeriksa License Plate
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
      console.error('Error checking License Plate:', err);
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
      console.error('Error checking GPS device ID:', err);
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

      // Validasi License Plate
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

      // Add vehicle through API
      const newVehicle = await addVehicle(formData);
      
      setSuccessMessage(`Kendaraan ${formData.make} ${formData.model} berhasil ditambahkan!`);
        
        // Tunggu 1 detik sebelum menutup modal
        setTimeout(() => {
        onSucceed(newVehicle); // Pass the new vehicle data to parent
        }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[400px] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black">
          <h2 className="text-lg font-semibold">Tambah Kendaraan Baru</h2>
          </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Nomor Plat */}
            <div>
              <label className="block text-sm mb-1"> Nomor Plat </label>
          <input
            type="text"
                name="license_plate"
                value={formData.license_plate}
            onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  licensePlateError ? 'border-red-500' : 'border-gray-300'
                }`}
            required
          />
              {licensePlateError && (
                <p className="mt-1 text-sm text-red-600">{licensePlateError}</p>
              )}
            </div>
          
            {/* Nama Kendaraan */}
            <div>
              <label className="block text-sm mb-1"> Nama Kendaraan </label>
          <input
            type="text"
                name="name"
                value={formData.name}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
            </div>
          
            {/* Merek */}
            <div>
              <label className="block text-sm mb-1"> Merek </label>
          <input
            type="text"
                name="make"
                value={formData.make}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
            </div>
          
            {/* Model */}
            <div>
              <label className="block text-sm mb-1"> Model </label>
          <input
            type="text"
                name="model"
                value={formData.model}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
            </div>
          
            {/* Tahun */}
            <div>
              <label className="block text-sm mb-1"> Tahun </label>
          <input
                type="number"
                name="year"
                value={formData.year}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
            </div>

            {/* Nomor SIM Card */}
            <div>
              <label className="block text-sm mb-1"> Nomor SIM Card </label>
          <input
            type="text"
                name="sim_card_number"
                value={formData.sim_card_number}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
            </div>
          
            {/* GPS Device ID */}
            <div>
              <label className="block text-sm mb-1"> GPS Device ID </label>
              <p className="text-xs text-gray-500 mb-2">Masukkan UUID yang ada pada alat GPS (opsional)</p>
              <input
                type="text"
                name="gps_id"
                value={formData.gps_id}
                onChange={handleChange}
                placeholder="Contoh: 123e4567-e89b-12d3-a456-426614174000"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  gpsError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {gpsError && (
                <p className="mt-1 text-sm text-red-600">{gpsError}</p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                {successMessage}
              </div>
            )}
          </div>

          {/* Footer dengan tombol */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || isCheckingGps}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}