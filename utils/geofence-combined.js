// utils/geofence-combined.js - Combined utility functions for geofence operations

// ==================== GEOFENCE UTILS ====================

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
  if (!vehicle.position) {
    return null;
  }
  
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
          // Circle stored as polygon
          const polygonCoords = geoData.coordinates[0]
            .map(coord => [coord[1], coord[0]]); // Konversi [lng, lat] ke [lat, lng]
          
          // Periksa apakah kendaraan berada di polygon (circle) ini
          const isInside = isPointInPolygon(vehiclePosition, polygonCoords);
          
          if (isInside) {
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
          const isInside = isPointInPolygon(vehiclePosition, polygonCoords);
          
          if (isInside) {
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
          const isInside = isPointInCircle(vehiclePosition, center, radius);
          
          if (isInside) {
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

// ==================== GEOFENCE API ====================

/**
 * Fetch alerts from Directus via local API
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of alerts to fetch
 * @param {string} params.sort - Sort order
 * @param {number} params.since_id - Get alerts since this ID
 * @returns {Promise<Object>} - Response from API
 */
export async function fetchAlerts({ limit = 20, sort = '-alert_id', since_id } = {}) {
  try {
    let url = `/api/alerts?limit=${limit}&sort=${sort}`;
    
    if (since_id) {
      url += `&since_id=${since_id}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch alerts');
    }

    return data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
}

/**
 * Menyimpan alert ke Directus - hanya untuk pelanggaran
 * @param {Object} alertData - Data alert
 * @returns {Promise<Object>} - Response dari API
 */
export async function saveAlert(alertData) {
  // Only save alerts for violations
  if (alertData.alert_type !== 'violation_enter' && alertData.alert_type !== 'violation_exit') {
    console.log(`🔕 Skipping non-violation alert: ${alertData.alert_type}`);
    return {
      success: true,
      message: 'Non-violation alert skipped',
      skipped: true
    };
  }

  try {
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(alertData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save alert');
    }

    console.log(`🚨 Saved violation alert: ${alertData.alert_type} for vehicle ${alertData.vehicle_id}`);
    return data;
  } catch (error) {
    console.error('Error saving alert:', error);
    throw error;
  }
}

/**
 * Generate alert message berdasarkan event type dan data kendaraan
 * Format sesuai dengan struktur alerts Directus yang baru
 * Hanya untuk violation_enter dan violation_exit
 * @param {string} eventType - Tipe event (violation_enter, violation_exit)
 * @param {Object} vehicleData - Data kendaraan
 * @param {Object} geofenceData - Data geofence
 * @returns {string} - Alert message
 */
export function generateAlertMessage(eventType, vehicleData, geofenceData) {
  const vehicleName = vehicleData.vehicle_name || 
                     vehicleData.name || 
                     `${vehicleData.make || ''} ${vehicleData.model || ''}`.trim() ||
                     'Kendaraan';
  const geofenceName = geofenceData.geofence_name || geofenceData.name || 'area geofence';
  const ruleType = geofenceData.rule_type || 'STAY_IN';

  switch (eventType) {
    case 'violation_enter':
      return `PELANGGARAN: Kendaraan ${vehicleName} memasuki geofence ${geofenceName} (FORBIDDEN)`;
    case 'violation_exit':
      return `PELANGGARAN: Kendaraan ${vehicleName} keluar dari geofence ${geofenceName} (${ruleType})`;
    default:
      // This shouldn't happen with new filtering, but just in case
      return `PELANGGARAN: Kendaraan ${vehicleName} pada geofence ${geofenceName}`;
  }
}

/**
 * Menentukan apakah event merupakan violation berdasarkan rule_type geofence
 * @param {string} eventType - Tipe event (enter/exit)
 * @param {string} ruleType - Rule type geofence (STAY_IN/FORBIDDEN)
 * @returns {boolean} - Apakah ini violation
 */
export function isViolation(eventType, ruleType) {
  // STAY_IN: kendaraan harus tetap di dalam, keluar = violation
  // FORBIDDEN: area terlarang, masuk = violation

  if (ruleType === 'STAY_IN' && eventType === 'exit') {
    return true;
  }

  if (ruleType === 'FORBIDDEN' && eventType === 'enter') {
    return true;
  }

  return false;
}

/**
 * Handler lengkap untuk menangani geofence violation
 * Hanya menyimpan alert untuk pelanggaran sebenarnya
 * @param {Object} params - Parameter violation
 * @param {string} params.eventType - enter/exit
 * @param {Object} params.vehicle - Data kendaraan
 * @param {Object} params.geofence - Data geofence
 * @param {string} params.timestamp - Timestamp event
 * @param {string} params.user_id - User ID for security validation
 * @returns {Promise<Object>} - Result dari penyimpanan
 */
export async function handleGeofenceViolation({
  eventType,
  vehicle,
  geofence,
  timestamp,
  user_id
}) {
  try {
    const isViolationEvent = isViolation(eventType, geofence.rule_type || 'STAY_IN');
    const finalEventType = isViolationEvent ? `violation_${eventType}` : eventType;

    // Data untuk alert (hanya untuk violation)
    const alertData = {
      vehicle_id: vehicle.vehicle_id,
      alert_type: finalEventType,
      alert_message: generateAlertMessage(finalEventType, vehicle, geofence),
      lokasi: vehicle.position ? `${vehicle.position.lat}, ${vehicle.position.lng}` : null,
      timestamp: timestamp,
      user_id: user_id // Add user_id for API validation
    };

    console.log('🔔 Processing geofence event:', {
      eventType: finalEventType,
      vehicle: vehicle.vehicle_name || vehicle.name,
      geofence: geofence.name,
      ruleType: geofence.rule_type,
      isViolation: isViolationEvent,
      willShowNotification: isViolationEvent,
      alertMessage: isViolationEvent ? alertData.alert_message : 'No alert (not a violation)',
      user_id: user_id
    });

    // Simpan alert (hanya untuk violation - filtered in saveAlert function)
    const alertResult = await saveAlert(alertData);

    return {
      success: true,
      alert: alertResult,
      isViolation: isViolationEvent
    };

  } catch (error) {
    console.error('Error handling geofence violation:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 