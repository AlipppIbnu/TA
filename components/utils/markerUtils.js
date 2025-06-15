// markerUtils.js - Utility functions for marker animations and rotations

// Calculate bearing (direction) between two coordinates
export const calculateBearing = (start, end) => {
  const lat1 = start[0] * Math.PI / 180;
  const lat2 = end[0] * Math.PI / 180;
  const deltaLon = (end[1] - start[1]) * Math.PI / 180;

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = Math.atan2(x, y) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360 degrees
};

// Calculate distance between two coordinates (in meters)
export const calculateDistance = (start, end) => {
  const R = 6371000; // Earth's radius in meters
  const lat1 = start[0] * Math.PI / 180;
  const lat2 = end[0] * Math.PI / 180;
  const deltaLat = (end[0] - start[0]) * Math.PI / 180;
  const deltaLon = (end[1] - start[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Create rotated vehicle icon based on bearing
export const createRotatedVehicleIcon = (bearing = 0) => {
  const L = require('leaflet');
  
  return new L.divIcon({
    html: `
      <div style="
        transform: rotate(${bearing}deg);
        transition: transform 0.3s ease;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="/icon/logo_mobil.png" 
             style="width: 30px; height: 30px;" 
             alt="Vehicle" />
      </div>
    `,
    className: 'custom-vehicle-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Determine if movement is significant enough to animate
export const isSignificantMovement = (oldPos, newPos, threshold = 5) => {
  if (!oldPos || !newPos) return false;
  
  const distance = calculateDistance(oldPos, newPos);
  return distance > threshold; // Only animate if moved more than threshold meters
};

// Get optimal animation duration based on distance
export const getOptimalAnimationDuration = (distance, minDuration = 1000, maxDuration = 5000) => {
  // Base duration on distance: 1-5 seconds depending on how far the vehicle moved
  const baseDuration = Math.min(Math.max(distance * 10, minDuration), maxDuration);
  return baseDuration;
}; 