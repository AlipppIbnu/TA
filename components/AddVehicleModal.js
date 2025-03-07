export default function AddVehicleModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-2">Tambah Kendaraan</h2>
        <input className="border p-2 w-full mb-2" placeholder="Nama Kendaraan" />
        <input className="border p-2 w-full mb-2" placeholder="Nomor Plat" />
        <input className="border p-2 w-full mb-2" placeholder="Latitude" />
        <input className="border p-2 w-full mb-2" placeholder="Longitude" />
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">Batal</button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded">Simpan</button>
        </div>
      </div>
    </div>
  );
}
