import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function MapComponent({ vehicles }) {
    return (
        <MapContainer center={[-6.200, 106.816]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {vehicles.map((vehicle) => (
                <Marker key={vehicle.id} position={vehicle.position}>
                    <Popup>
                        <b>{vehicle.name}</b><br />
                        Status: {vehicle.status === "online" ? "🟢 Online" : "🔴 Offline"}<br />
                        Waktu: {vehicle.time}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
