import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";

// Custom icon kendaraan
const vehicleIcon = new L.Icon({
  iconUrl: "/icon/logo_mobil.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Komponen untuk fly ke posisi tertentu (kendaraan atau awal riwayat)
const FlyToVehicle = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);
    }
  }, [position, map]);
  return null;
};

const MapComponent = forwardRef(({ vehicles, selectedVehicle }, ref) => {
  const [selected, setSelected] = useState(null);
  const [flyPosition, setFlyPosition] = useState(null);

  const initialCenter =
    vehicles.length > 0 && vehicles[0].position
      ? [vehicles[0].position.lat, vehicles[0].position.lng]
      : [-6.200, 106.816]; // fallback ke Jakarta

  // expose ke parent
  useImperativeHandle(ref, () => ({
    flyToVehicle: (position) => {
      setFlyPosition(position);
    },
  }));

  // Efek saat kendaraan dipilih
  useEffect(() => {
    if (selectedVehicle?.path?.length > 0) {
      // Jika ada path, fly ke titik awal path
      setFlyPosition(selectedVehicle.path[0]);
    } else if (selectedVehicle?.position) {
      setFlyPosition([selectedVehicle.position.lat, selectedVehicle.position.lng]);
    }
  }, [selectedVehicle]);

  return (
    <MapContainer
      center={initialCenter}
      zoom={12}
      style={{ width: "100%", height: "100vh" }}
      whenReady={() => setFlyPosition(initialCenter)}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Auto fly ke posisi kendaraan atau awal riwayat */}
      {flyPosition && <FlyToVehicle position={flyPosition} />}

      {/* Tampilkan semua marker kendaraan */}
      {vehicles.map((vehicle) =>
        vehicle.position ? (
          <Marker
            key={vehicle.id}
            position={[vehicle.position.lat, vehicle.position.lng]}
            icon={vehicleIcon}
            eventHandlers={{
              click: () => setSelected(vehicle),
            }}
          />
        ) : null
      )}

      {/* Tampilkan Popup saat marker diklik */}
      {selected && (
        <Popup
          position={[selected.position.lat, selected.position.lng]}
          onClose={() => setSelected(null)}
        >
          <div>
            <h3>
              {selected.merek} {selected.model} ({selected.nomor_kendaraan})
            </h3>
            <p>
              <strong>Status:</strong> {selected.status || "Tidak diketahui"}
            </p>
            <p>
              <strong>Koordinat:</strong> {selected.position.lat},{" "}
              {selected.position.lng}
            </p>
            <p>
              <strong>Update:</strong>{" "}
              {new Date(selected.position.timestamp).toLocaleString()}
            </p>
          </div>
        </Popup>
      )}

      {/* 🔵 Tampilkan riwayat polyline jika tersedia */}
      {selectedVehicle?.path && selectedVehicle.path.length > 1 && (
        <Polyline positions={selectedVehicle.path} color="blue" />
      )}
    </MapContainer>
  );
});

export default MapComponent;
