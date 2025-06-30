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
  console.group('🔍 getGeofenceStatus Debug');
  console.log('Input vehicle:', {
    vehicleId: vehicle.vehicle_id,
    name: vehicle.name,
    hasPosition: !!vehicle.position,
    position: vehicle.position ? `${vehicle.position.lat}, ${vehicle.position.lng}` : 'No position'
  });
  console.log('Input geofences:', geofences.map(g => ({
    id: g.geofence_id,
    name: g.name,
    ruleType: g.rule_type,
    type: g.type,
    hasDefinition: !!g.definition
  })));
  
  if (!vehicle.position) {
    console.log('❌ No vehicle position, returning null');
    console.groupEnd();
    return null;
  }
  
  const vehiclePosition = [vehicle.position.lat, vehicle.position.lng];
  console.log('🎯 Vehicle position:', vehiclePosition);
  
  let nearestGeofence = null;
  let minDistance = Infinity;
  
  // Periksa apakah kendaraan berada di dalam geofence mana pun
  for (const geofence of geofences) {
    console.log(`\n📍 Checking geofence: ${geofence.name} (ID: ${geofence.geofence_id})`);
    console.log('   Rule type:', geofence.rule_type);
    console.log('   Type:', geofence.type);
    
    try {
      // Parse data geofence 
      const geoData = typeof geofence.definition === 'string' 
        ? JSON.parse(geofence.definition) 
        : geofence.definition;
      
      console.log('   Geo data type:', geoData?.type);
      console.log('   Has coordinates:', !!geoData?.coordinates);
      
      if (geoData && geoData.coordinates) {
        // Check the original type field to distinguish between polygon and circle
        const originalType = geofence.type; // This is the type we set (polygon/circle)
        console.log('   Original type:', originalType);
        
        if (originalType === 'circle') {
          // Circle stored as polygon - we need to reconstruct circle properties
          // For now, we'll treat it as a polygon since we converted it
          // But we could store the original radius in a separate field if needed
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          
          console.log('   Circle as polygon coords count:', polygonCoords.length);
          console.log('   First few coords:', polygonCoords.slice(0, 3));
          
          // Periksa apakah kendaraan berada di polygon (circle) ini
          const isInside = isPointInPolygon(vehiclePosition, polygonCoords);
          console.log('   Vehicle inside circle?', isInside);
          
          if (isInside) {
            const result = {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('✅ INSIDE CIRCLE GEOFENCE! Returning:', result);
            console.groupEnd();
            return result;
          }
          
          // Jika tidak di dalam, hitung jarak ke polygon terdekat
          const distance = distanceToPolygon(vehiclePosition, polygonCoords);
          console.log('   Distance to circle:', distance, 'meters');
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('   Updated nearest geofence (circle)');
          }
        }
        else if (geoData.type === 'Polygon') {
          // Regular polygon
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          
          console.log('   Polygon coords count:', polygonCoords.length);
          console.log('   First few coords:', polygonCoords.slice(0, 3));
          
          // Periksa apakah kendaraan berada di geofence ini
          const isInside = isPointInPolygon(vehiclePosition, polygonCoords);
          console.log('   Vehicle inside polygon?', isInside);
          
          if (isInside) {
            const result = {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('✅ INSIDE POLYGON GEOFENCE! Returning:', result);
            console.groupEnd();
            return result;
          }
          
          // Jika tidak di dalam, hitung jarak ke geofence terdekat
          const distance = distanceToPolygon(vehiclePosition, polygonCoords);
          console.log('   Distance to polygon:', distance, 'meters');
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('   Updated nearest geofence (polygon)');
          }
        } 
        else if (geoData.type === 'Circle') {
          // Legacy circle format (if any exist)
          const center = [geoData.coordinates.center[1], geoData.coordinates.center[0]]; // Konversi [lng, lat] ke [lat, lng]
          const radius = geoData.coordinates.radius;
          
          console.log('   Legacy circle center:', center);
          console.log('   Legacy circle radius:', radius);
          
          // Periksa apakah kendaraan berada di circle ini
          const isInside = isPointInCircle(vehiclePosition, center, radius);
          console.log('   Vehicle inside legacy circle?', isInside);
          
          if (isInside) {
            const result = {
              inside: true,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('✅ INSIDE LEGACY CIRCLE GEOFENCE! Returning:', result);
            console.groupEnd();
            return result;
          }
          
          // Jika tidak di dalam, hitung jarak ke center circle
          const distance = distanceToCircle(vehiclePosition, center) - radius;
          console.log('   Distance to legacy circle:', distance, 'meters');
          
          if (distance >= 0 && distance < minDistance) {
            minDistance = distance;
            nearestGeofence = {
              inside: false,
              name: geofence.name,
              id: geofence.geofence_id || geofence.id,
              distance: distance, // Jarak dalam meter
              type: geofence.rule_type || 'STAY_IN'
            };
            console.log('   Updated nearest geofence (legacy circle)');
          }
        } else {
          console.log('   ⚠️ Unknown geofence data type:', geoData.type);
        }
      } else {
        console.log('   ⚠️ No geofence coordinates found');
      }
    } catch (e) {
      console.error('   ❌ Error processing geofence:', e);
    }
  }
  
  const finalResult = nearestGeofence || { inside: false, name: null };
  console.log('🏁 Final result:', finalResult);
  console.groupEnd();
  
  return finalResult;
} 