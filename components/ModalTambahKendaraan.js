'use client';

import { useState } from "react";

export default function ModalTambahKendaraan({ onClose, onSucceed }) {
  const [formData, setFormData] = useState({
    nomor_kendaraan: "",
    merek: "",
    model: "",
    tahun_pembuatan: "",
    warna: "",
    jenis_kendaraan: "",
    pemilik: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Handle perubahan input form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validasi dan kirim data ke API - menggunakan Promise chain alih-alih async/await
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
  
    if (
      !formData.nomor_kendaraan ||
      !formData.merek ||
      !formData.model ||
      !formData.warna ||
      !formData.jenis_kendaraan ||
      !formData.tahun_pembuatan ||
      !formData.pemilik
    ) {
      alert("Semua field harus diisi!");
      setLoading(false);
      return;
    }
  
    console.log("Mengirim data:", formData); // Debug data yang dikirim
    
    fetch("/api/TambahKendaraan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((errorData) => {
            throw new Error(`Gagal tambah kendaraan: ${errorData.message || res.statusText}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("Data berhasil ditambahkan:", data); // Debug jika berhasil
        setSuccessMessage(`Kendaraan ${formData.merek} ${formData.model} berhasil ditambahkan!`);
        
        // Tunggu 2 detik sebelum menutup modal
        setTimeout(() => {
          onSucceed();
        }, 2000);
      })
      .catch((err) => {
        console.error("Error tambah kendaraan:", err); // Debug error
        alert(`Gagal tambah kendaraan: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-md w-96">
        <h2 className="text-xl font-bold mb-4">Tambah Kendaraan</h2>
        
        {/* Menampilkan pesan sukses jika ada */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md border border-green-300">
            ✅ {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nomor_kendaraan"
            placeholder="Nomor Kendaraan"
            value={formData.nomor_kendaraan}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="merek"
            placeholder="Merek"
            value={formData.merek}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="model"
            placeholder="Model"
            value={formData.model}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="tahun_pembuatan"
            placeholder="Tahun Pembuatan"
            value={formData.tahun_pembuatan}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="warna"
            placeholder="Warna"
            value={formData.warna}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="jenis_kendaraan"
            placeholder="Jenis Kendaraan"
            value={formData.jenis_kendaraan}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="pemilik"
            placeholder="Pemilik"
            value={formData.pemilik}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}