import { Polyline, CircleMarker } from "react-leaflet";

const HistoryPath = ({ path }) => {
  if (!path || path.length === 0) return null;

  // Filter valid coordinates
  const validPath = path.filter(coord => 
    coord && 
    !isNaN(coord.lat) && !isNaN(coord.lng) &&
    coord.lat >= -90 && coord.lat <= 90 &&
    coord.lng >= -180 && coord.lng <= 180
  );

  if (validPath.length < 2) return null;

  return (
    <>
      {/* History Line */}
      <Polyline
        positions={validPath.map(coord => [coord.lat, coord.lng])}
        color="blue"
        weight={3}
        opacity={0.7}
      />

      {/* Start Point (Green) */}
      <CircleMarker
        center={[validPath[0].lat, validPath[0].lng]}
        radius={8}
        color="green"
        fillColor="green"
        fillOpacity={1}
      />

      {/* End Point (Red) */}
      <CircleMarker
        center={[
          validPath[validPath.length - 1].lat,
          validPath[validPath.length - 1].lng
        ]}
        radius={8}
        color="red"
        fillColor="red"
        fillOpacity={1}
      />
    </>
  );
};

export default HistoryPath; 