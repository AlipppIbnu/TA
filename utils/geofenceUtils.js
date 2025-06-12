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
 * Memeriksa apakah suatu titik berada di dalam salah satu polygon dari multipolygon
 * @param {Array} point - [lat, lng] dari titik yang akan dicek
 * @param {Array} multipolygon - Array dari polygon
 * @returns {Boolean} - true jika titik berada di dalam salah satu polygon
 */
export function isPointInMultiPolygon(point, multipolygon) {
  return multipolygon.some(polygon => isPointInPolygon(point, polygon));
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
    
    // Hitung jarak ke segmen
    const distance = distanceToSegment(point, segment);
    minDistance = Math.min(minDistance, distance);
  }
  
  // Hitung jarak ke segmen garis
  function distanceToSegment(point, segment) {
    const [p1, p2] = segment;
    
    // Kasus khusus: segmen sebenarnya adalah titik
    if (p1[0] === p2[0] && p1[1] === p2[1]) {
      return haversineDistance(point, p1);
    }
    
    // Cari titik terdekat pada segmen menggunakan proyeksi vektor
    // Ini adalah pendekatan untuk jarak kecil
    const x = point[0], y = point[1];
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
    
    // Hitung panjang kuadrat segmen
    const segmentLengthSquared = (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
    
    // Proyeksikan titik ke segmen
    let t = ((x-x1)*(x2-x1) + (y-y1)*(y2-y1)) / segmentLengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    // Cari titik terdekat pada segmen
    const nearestX = x1 + t * (x2-x1);
    const nearestY = y1 + t * (y2-y1);
    
    // Hitung jarak ke titik terdekat
    return haversineDistance(point, [nearestX, nearestY]);
  }
  
  return minDistance;
}

/**
 * Mendapatkan status geofence untuk suatu kendaraan
 * @param {Object} vehicle - Objek kendaraan dengan properti position
 * @param {Array} geofences - Array dari objek geofence
 * @returns {Object|null} - Objek status geofence atau null
 */
export function getGeofenceStatus(vehicle, geofences) {
  if (!vehicle.position) return null;
  
  const vehiclePosition = [vehicle.position.lat, vehicle.position.lng];
  let nearestGeofence = null;
  let minDistance = Infinity;
  
  // Periksa apakah kendaraan berada di dalam geofence mana pun
  for (const geofence of geofences) {
    let geofencePolygons = [];
    
    try {
      // Parse data geofence (bisa single polygon atau multipolygon)
      const geoData = typeof geofence.definition === 'string' 
        ? JSON.parse(geofence.definition) 
        : geofence.definition;
      
      if (geoData && geoData.coordinates) {
        // Tangani single polygon dan multipolygon
        if (geoData.type === 'Polygon') {
          // Single polygon - format koordinat
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          geofencePolygons = [polygonCoords];
        } 
        else if (geoData.type === 'MultiPolygon') {
          // MultiPolygon - format koordinat setiap polygon
          geofencePolygons = geoData.coordinates.map(polygonCoords => 
            polygonCoords[0].map(coord => [coord[1], coord[0]])
          );
        }
      }
      
      // Periksa apakah kendaraan berada di geofence ini
      if (geofencePolygons.length && isPointInMultiPolygon(vehiclePosition, geofencePolygons)) {
        return {
          inside: true,
          name: geofence.name,
          id: geofence.geofence_id || geofence.id,
          type: geofence.rule_type || 'STAY_IN'
        };
      }
      
      // Jika tidak di dalam, hitung jarak ke geofence terdekat
      if (geofencePolygons.length) {
        // Cari polygon terdekat
        geofencePolygons.forEach(polygon => {
          const distance = distanceToPolygon(vehiclePosition, polygon);
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
        });
      }
    } catch (e) {
      console.error('Error processing geofence:', e);
    }
  }
  
  return nearestGeofence || { inside: false, name: null };
} 