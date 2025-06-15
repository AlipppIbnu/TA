/**
 * Memeriksa apakah suatu titik berada di dalam polygon menggunakan algoritma ray casting
 * @param {Array} point - [lat, lng] dari titik yang akan dicek
 * @param {Array} polygon - Array dari [lat, lng] titik yang membentuk polygon
 * @returns {Boolean} - true jika titik berada di dalam polygon
 */
export function isPointInPolygon(point, polygon) {
  // Algoritma ray casting
  let inside = false;
  const x = point[0], y = point[1];
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Memeriksa apakah suatu titik berada di dalam circle
 * @param {Array} point - [lat, lng] dari titik yang akan dicek
 * @param {Array} center - [lat, lng] dari center circle
 * @param {Number} radius - radius dalam meter
 * @returns {Boolean} - true jika titik berada di dalam circle
 */
export function isPointInCircle(point, center, radius) {
  const distance = haversineDistance(point, center);
  return distance <= radius;
}

/**
 * Menghitung jarak minimum dari suatu titik ke polygon dalam meter
 * @param {Array} point - [lat, lng] dari titik
 * @param {Array} polygon - Array dari [lat, lng] titik yang membentuk polygon
 * @returns {Number} - jarak dalam meter
 */
export function distanceToPolygon(point, polygon) {
  // Konversi lat/lng ke radian untuk formula Haversine
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
  // Formula Haversine untuk menghitung jarak antara dua titik dalam km
  function haversineDistance(point1, point2) {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = toRadians(point2[0] - point1[0]);
    const dLon = toRadians(point2[1] - point1[1]);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(point1[0])) * Math.cos(toRadians(point2[0])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Cari jarak minimum ke sisi mana pun dari polygon
  let minDistance = Infinity;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const segment = [polygon[j], polygon[i]];
    
    // Hitung jarak titik ke segmen garis
    const A = point[0] - segment[0][0];
    const B = point[1] - segment[0][1];
    const C = segment[1][0] - segment[0][0];
    const D = segment[1][1] - segment[0][1];
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = segment[0][0];
      yy = segment[0][1];
    } else if (param > 1) {
      xx = segment[1][0];
      yy = segment[1][1];
    } else {
      xx = segment[0][0] + param * C;
      yy = segment[0][1] + param * D;
    }
    
    const distance = haversineDistance(point, [xx, yy]);
    minDistance = Math.min(minDistance, distance);
  }
  
  return minDistance;
}

/**
 * Menghitung jarak dari titik ke center circle dalam meter
 * @param {Array} point - [lat, lng] dari titik
 * @param {Array} center - [lat, lng] dari center circle
 * @returns {Number} - jarak dalam meter
 */
export function distanceToCircle(point, center) {
  return haversineDistance(point, center);
}

// Helper function untuk menghitung jarak Haversine
function haversineDistance(point1, point2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = toRadians(point2[0] - point1[0]);
  const dLon = toRadians(point2[1] - point1[1]);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(point1[0])) * Math.cos(toRadians(point2[0])) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Mengecek status geofence untuk kendaraan tertentu
 * @param {Object} vehicle - object kendaraan dengan properti position
 * @param {Array} geofences - array geofences yang akan dicek
 * @returns {Object|null} - status geofence atau null
 */
export function getGeofenceStatus(vehicle, geofences) {
  if (!vehicle.position) return null;
  
  const vehiclePosition = [vehicle.position.lat, vehicle.position.lng];
  let nearestGeofence = null;
  let minDistance = Infinity;
  
  // Periksa apakah kendaraan berada di dalam geofence mana pun
  for (const geofence of geofences) {
    try {
      // Parse data geofence 
      const geoData = typeof geofence.definition === 'string' 
        ? JSON.parse(geofence.definition) 
        : geofence.definition;
      
      if (geoData && geoData.coordinates) {
        // Check the original type field to distinguish between polygon and circle
        const originalType = geofence.type; // This is the type we set (polygon/circle)
        
        if (originalType === 'circle') {
          // Circle stored as polygon - we need to reconstruct circle properties
          // For now, we'll treat it as a polygon since we converted it
          // But we could store the original radius in a separate field if needed
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          
          // Periksa apakah kendaraan berada di polygon (circle) ini
          if (isPointInPolygon(vehiclePosition, polygonCoords)) {
            return {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
          }
          
          // Jika tidak di dalam, hitung jarak ke polygon terdekat
          const distance = distanceToPolygon(vehiclePosition, polygonCoords);
          if (distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
          }
        }
        else if (geoData.type === 'Polygon') {
          // Regular polygon
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          
          // Periksa apakah kendaraan berada di geofence ini
          if (isPointInPolygon(vehiclePosition, polygonCoords)) {
            return {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
          }
          
          // Jika tidak di dalam, hitung jarak ke geofence terdekat
          const distance = distanceToPolygon(vehiclePosition, polygonCoords);
          if (distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
          }
        } 
        else if (geoData.type === 'Circle') {
          // Legacy circle format (if any exist)
          const center = [geoData.coordinates.center[1], geoData.coordinates.center[0]]; // Konversi [lng, lat] ke [lat, lng]
          const radius = geoData.coordinates.radius;
          
          // Periksa apakah kendaraan berada di circle ini
          if (isPointInCircle(vehiclePosition, center, radius)) {
            return {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
          }
          
          // Jika tidak di dalam, hitung jarak ke center circle
          const distance = distanceToCircle(vehiclePosition, center) - radius;
          if (distance >= 0 && distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
          }
        }
      }
    } catch (e) {
      console.error('Error processing geofence:', e);
    }
  }
  
  return nearestGeofence || { inside: false, name: null };
} 