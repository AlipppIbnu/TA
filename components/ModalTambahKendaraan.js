//Tambah Kendaraan
'use client';

import { useState } from "react";
import { addVehicle } from "../lib/vehicleService";

export default function ModalTambahKendaraan({ onClose, onSucceed }) {
  // State untuk form data
  const [formData, setFormData] = useState({
    vehicle_id: "",
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
  const [vehicleIdError, setVehicleIdError] = useState("");

  // Handle perubahan input form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset error messages when user types
    if (name === 'gps_id') {
      setGpsError('');
    }
    if (name === 'vehicle_id') {
      setVehicleIdError('');
    }
    setError('');
  };

  // Fungsi untuk memeriksa Vehicle ID
  const checkVehicleId = async (vehicleId) => {
    try {
      const response = await fetch(`/api/CheckVehicle?vehicle_id=${vehicleId}`);
      const data = await response.json();

      if (data.exists) {
        setVehicleIdError('Vehicle ID sudah digunakan');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking Vehicle ID:', err);
      setVehicleIdError('Gagal memeriksa Vehicle ID');
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
      if (!formData.vehicle_id || !formData.license_plate || !formData.name || 
          !formData.make || !formData.model || !formData.year) {
        throw new Error("Mohon isi semua field yang wajib!");
      }

      // Validasi Vehicle ID
      const isVehicleIdAvailable = await checkVehicleId(formData.vehicle_id);
      if (!isVehicleIdAvailable) {
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
            {/* Vehicle ID */}
            <div>
              <label className="block text-sm mb-1"> Vehicle ID </label>
              <input
                type="text"
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  vehicleIdError ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {vehicleIdError && (
                <p className="mt-1 text-sm text-red-600">{vehicleIdError}</p>
              )}
            </div>
            
            {/* Nomor Plat */}
            <div>
              <label className="block text-sm mb-1"> Nomor Plat </label>
          <input
            type="text"
                name="license_plate"
                value={formData.license_plate}
            onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
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
              <input
                type="text"
                name="gps_id"
                value={formData.gps_id}
                onChange={handleChange}
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
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                {successMessage}
              </div>
            )}
          </div>
          
          {/* Footer with buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-black flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-gray-300 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center min-w-[100px] ${
                (loading || isCheckingGps) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading || isCheckingGps}
            >
              {loading || isCheckingGps ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isCheckingGps ? 'Memeriksa GPS...' : 'Menyimpan...'}
                </>
              ) : (
                'Simpan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}