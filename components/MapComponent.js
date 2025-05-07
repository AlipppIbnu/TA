import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";

// Membuat ikon khusus untuk kendaraan
const vehicleIcon = new L.Icon({
  iconUrl: "/icon/logo_mobil.png",   // Menentukan URL gambar ikon kendaraan
  iconSize: [30, 30],                // Ukuran ikon kendaraan
  iconAnchor: [15, 30],              // Titik anchor ikon di posisi marker
  popupAnchor: [0, -30],             // Menentukan jarak antara marker dan popup
});

// Komponen untuk terbang ke posisi tertentu (kendaraan atau titik awal riwayat)
const FlyToVehicle = ({ position }) => {
  const map = useMap();  // Mengakses instance peta dari react-leaflet
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);  // Terbang ke posisi yang diberikan dengan zoom level 16
    }
  }, [position, map]);  // Efek akan dijalankan jika posisi atau peta berubah
  return null;
};

// Komponen utama peta kendaraan, menggunakan forwardRef agar dapat menerima fungsi dari parent
const MapComponent = forwardRef(({ vehicles, selectedVehicle }, ref) => {
  const [selected, setSelected] = useState(null);  // State untuk kendaraan yang dipilih
  const [flyPosition, setFlyPosition] = useState(null);  // Posisi untuk terbang ke peta

  // Menentukan posisi awal peta, jika tidak ada kendaraan maka fallback ke Jakarta
  const initialCenter =
    vehicles.length > 0 && vehicles[0].position
      ? [vehicles[0].position.lat, vehicles[0].position.lng]
      : [-6.200, 106.816];  // fallback ke Jakarta

  // Menyediakan fungsi untuk parent agar bisa memanggil flyToVehicle
  useImperativeHandle(ref, () => ({
    flyToVehicle: (position) => {
      setFlyPosition(position);  // Fungsi untuk mengatur posisi terbang
    },
  }));

  // Efek saat kendaraan dipilih atau path kendaraan berubah
  useEffect(() => {
    if (selectedVehicle?.position) {
      // Selalu terbang ke posisi terakhir kendaraan
      setFlyPosition([selectedVehicle.position.lat, selectedVehicle.position.lng]);
    }
  }, [selectedVehicle]);
    // Efek akan dijalankan jika selectedVehicle berubah

  return (
    <MapContainer
      center={initialCenter}  // Menetapkan posisi awal peta
      zoom={12}  // Menetapkan level zoom awal
      style={{ width: "100%", height: "100vh" }}  // Peta mengambil seluruh tinggi dan lebar layar
      whenReady={() => setFlyPosition(initialCenter)}  // Mengatur posisi terbang awal saat peta siap
      className="map-container"  // Menambahkan kelas CSS untuk peta
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"  // URL untuk peta OpenStreetMap
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'  // Atribusi OSM
      />

      {/* Jika flyPosition ada, terbang ke posisi tersebut */}
      {flyPosition && <FlyToVehicle position={flyPosition} />}

      {/* Tampilkan semua marker kendaraan di peta */}
      {vehicles.map((vehicle) =>
        vehicle.position ? (
          <Marker
            key={vehicle.id}
            position={[vehicle.position.lat, vehicle.position.lng]}  // Posisi marker sesuai dengan koordinat kendaraan
            icon={vehicleIcon}  // Ikon kendaraan yang telah didefinisikan sebelumnya
            eventHandlers={{
              click: () => setSelected(vehicle),  // Saat marker diklik, set kendaraan yang dipilih
            }}
          />
        ) : null
      )}

      {/* Tampilkan Popup ketika marker kendaraan diklik */}
      {selected && (
        <Popup
          position={[selected.position.lat, selected.position.lng]}  // Posisi popup mengikuti marker
          onClose={() => setSelected(null)}  // Tutup popup ketika popup ditutup
        >
          <div>
            <h3>
              {selected.merek} {selected.model} ({selected.nomor_kendaraan})  {/* Menampilkan informasi kendaraan */}
            </h3>
            <p>
              <strong>Status:</strong> {selected.status || "Tidak diketahui"}  {/* Menampilkan status kendaraan */}
            </p>
            <p>
              <strong>Koordinat:</strong> {selected.position.lat}, {selected.position.lng}  {/* Koordinat kendaraan */}
            </p>
            <p>
              <strong>Update:</strong>{" "}
              {new Date(selected.position.timestamp).toLocaleString()}  {/* Waktu pembaruan koordinat */}
            </p>
          </div>
        </Popup>
      )}

      {/* Jika kendaraan yang dipilih memiliki path (riwayat perjalanan), tampilkan Polyline */}
      {selectedVehicle?.path && selectedVehicle.path.length > 1 && (
        <Polyline positions={selectedVehicle.path} color="blue" />  /* Menggambar path riwayat kendaraan */
      )}
    </MapContainer>
  );
});

export default MapComponent;
