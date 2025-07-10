/**
 * Utilitas untuk operasi geofence
 * Menyediakan fungsi untuk menghitung jarak, mengecek point-in-polygon,
 * dan menentukan status geofence untuk kendaraan
 */

/**
 * Hitung jarak antara dua titik koordinat menggunakan formula Haversine
 * @param {number} lat1 - Latitude titik pertama
 * @param {number} lon1 - Longitude titik pertama  
 * @param {number} lat2 - Latitude titik kedua
 * @param {number} lon2 - Longitude titik kedua
 * @returns {number} - Jarak dalam meter
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Cek apakah sebuah titik berada di dalam polygon menggunakan algoritma ray casting
 * @param {Array} point - [lat, lng] koordinat titik
 * @param {Array} polygon - Array koordinat polygon [[lat1, lng1], [lat2, lng2], ...]
 * @returns {boolean} - true jika titik berada di dalam polygon
 */
export function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];
    
    if (((lngi > lng) !== (lngj > lng)) &&
        (lat < (latj - lati) * (lng - lngi) / (lngj - lngi) + lati)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Cek apakah sebuah titik berada di dalam lingkaran
 * @param {Array} point - [lat, lng] koordinat titik
 * @param {Array} center - [lat, lng] koordinat pusat lingkaran
 * @param {number} radius - Radius lingkaran dalam meter
 * @returns {boolean} - true jika titik berada di dalam lingkaran
 */
export function isPointInCircle(point, center, radius) {
  const [pointLat, pointLng] = point;
  const [centerLat, centerLng] = center;
  
  const distance = calculateDistance(pointLat, pointLng, centerLat, centerLng);
  return distance <= radius;
}

/**
 * Hitung jarak minimum dari titik ke polygon
 * @param {Array} point - [lat, lng] koordinat titik
 * @param {Array} polygon - Array koordinat polygon
 * @returns {number} - Jarak minimum dalam meter
 */
export function distanceToPolygon(point, polygon) {
  const [pointLat, pointLng] = point;
  let minDistance = Infinity;
  
  // Hitung jarak ke setiap sisi polygon
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[j];
    
    // Hitung jarak dari titik ke garis
    const distance = distanceToLineSegment(pointLat, pointLng, lat1, lng1, lat2, lng2);
    minDistance = Math.min(minDistance, distance);
  }
  
  return minDistance;
}

/**
 * Hitung jarak dari titik ke segmen garis
 * @param {number} px, py - Koordinat titik
 * @param {number} x1, y1, x2, y2 - Koordinat titik awal dan akhir garis
 * @returns {number} - Jarak dalam meter
 */
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Garis adalah titik
    return calculateDistance(px, py, x1, y1);
  }
  
  let param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  return calculateDistance(px, py, xx, yy);
}

/**
 * Mengecek status geofence untuk kendaraan tertentu
 * @param {Object} vehicle - object kendaraan dengan properti position
 * @param {Array} geofences - array geofences yang akan dicek
 * @returns {Object|null} - status geofence atau null
 */
export function getGeofenceStatus(vehicle, geofences) {
  if (!vehicle.position) {
    return null;
  }
  
  const vehiclePosition = [vehicle.position.lat, vehicle.position.lng];
  
  let nearestGeofence = null;
  let minDistance = Infinity;
  
  for (const geofence of geofences) {
    try {
      // Parse definisi geofence
      const geoData = typeof geofence.definition === 'string' 
        ? JSON.parse(geofence.definition) 
        : geofence.definition;
      
      if (!geoData || !geoData.coordinates) {
        continue;
      }
      
      let isInside = false;
      let distance = 0;
      
      // Cek berdasarkan tipe geofence
      if (geoData.type === 'Circle') {
        const center = [geoData.coordinates.center[1], geoData.coordinates.center[0]];
        const radius = geoData.coordinates.radius;
        
        distance = calculateDistance(
          vehiclePosition[0], vehiclePosition[1],
          center[0], center[1]
        );
        
        isInside = distance <= radius;
        
        if (!isInside) {
          distance = distance - radius; // Jarak ke edge circle
        }
      } else {
        // Polygon atau bentuk lain
        const coords = geoData.coordinates[0].map(coord => [coord[1], coord[0]]);
        isInside = isPointInPolygon(vehiclePosition, coords);
        
        if (!isInside) {
          distance = distanceToPolygon(vehiclePosition, coords);
        }
      }
      
      // Update geofence terdekat
      if (isInside || distance < minDistance) {
        nearestGeofence = {
          id: geofence.geofence_id || geofence.id,
          name: geofence.name,
          type: geofence.rule_type,
          inside: isInside,
          distance: isInside ? 0 : distance
        };
        
        if (isInside) {
          minDistance = 0;
        } else {
          minDistance = distance;
        }
      }
      
    } catch (error) {
      // Skip geofence dengan definisi yang invalid
      continue;
    }
  }
  
  const finalResult = nearestGeofence || { inside: false, name: null };
  
  return finalResult;
} 

/**
 * Hitung total jarak yang ditempuh dari array path
 * @param {Array} path - Array koordinat [{lat, lng}, {lat, lng}, ...]
 * @returns {number} - Total jarak dalam kilometer
 */
export const calculateTotalDistance = (path) => {
  if (!path || !Array.isArray(path) || path.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const point1 = path[i];
    const point2 = path[i + 1];
    
    // Validasi koordinat
    if (point1 && point2 && 
        typeof point1.lat === 'number' && typeof point1.lng === 'number' &&
        typeof point2.lat === 'number' && typeof point2.lng === 'number' &&
        !isNaN(point1.lat) && !isNaN(point1.lng) &&
        !isNaN(point2.lat) && !isNaN(point2.lng)) {
      
      const distance = calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
      totalDistance += distance;
    }
  }
  
  // Konversi meter ke kilometer dan bulatkan ke 2 desimal
  return Math.round((totalDistance / 1000) * 100) / 100;
};

/**
 * Format tampilan kecepatan dengan logika threshold
 * - Kecepatan 1-5 km/h: tampilkan 0
 * - Kecepatan > 5 km/h: tampilkan kecepatan sebenarnya
 * - Kecepatan 0 atau null/undefined: tampilkan 0
 */
export const formatSpeedDisplay = (speed) => {
  const numericSpeed = parseFloat(speed) || 0;
  
  // Jika kecepatan antara 1-5 km/h, tampilkan sebagai 0
  if (numericSpeed >= 1 && numericSpeed <= 5) {
    return 0;
  }
  
  // Jika tidak, tampilkan kecepatan sebenarnya
  return Math.round(numericSpeed);
}; 