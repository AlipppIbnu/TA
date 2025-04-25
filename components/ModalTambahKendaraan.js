// components/ModalTambahKendaraan.jsx
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

  // Handle perubahan input form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validasi dan kirim data ke API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
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
  
    try {
      console.log("Mengirim data:", formData); // Debug data yang dikirim
      const res = await fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/daftar_kendaraan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DIRECTUS_TOKEN}`,
        },
        body: JSON.stringify({ ...formData }),
      });
  
      if (!res.ok) {
        throw new Error("Gagal tambah kendaraan");
      }
  
      console.log("Data berhasil ditambahkan!"); // Debug jika berhasil
      onSucceed();
    } catch (err) {
      console.error("Error tambah kendaraan:", err); // Debug error
      alert("Gagal tambah kendaraan.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-md w-96">
        <h2 className="text-xl font-bold mb-4">Tambah Kendaraan</h2>
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
