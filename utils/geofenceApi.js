// utils/geofenceApi.js - Utility functions untuk mengirim data geofence events dan alerts

/**
 * Menyimpan geofence event ke Directus
 * @param {Object} eventData - Data event geofence
 * @returns {Promise<Object>} - Response dari API
 */
export async function saveGeofenceEvent(eventData) {
  try {
    const response = await fetch('/api/geofence-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save geofence event');
    }

    return data;
  } catch (error) {
    console.error('Error saving geofence event:', error);
    throw error;
  }
}

/**
 * Menyimpan alert ke Directus
 * @param {Object} alertData - Data alert
 * @returns {Promise<Object>} - Response dari API
 */
export async function saveAlert(alertData) {
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

    return data;
  } catch (error) {
    console.error('Error saving alert:', error);
    throw error;
  }
}

/**
 * Generate alert message berdasarkan event type dan data kendaraan
 * @param {string} eventType - Tipe event (violation_enter atau violation_exit)
 * @param {Object} vehicleData - Data kendaraan
 * @param {Object} geofenceData - Data geofence
 * @returns {string} - Alert message
 */
export function generateAlertMessage(eventType, vehicleData, geofenceData) {
  const vehicleName = vehicleData.vehicle_name || vehicleData.name || 'Kendaraan';
  const geofenceName = geofenceData.geofence_name || geofenceData.name || 'area geofence';
  
  switch (eventType) {
    case 'violation_enter':
      return `PELANGGARAN: ${vehicleName} memasuki geofence terlarang ${geofenceName} (FORBIDDEN)`;
    case 'violation_exit':
      return `PELANGGARAN: ${vehicleName} keluar dari geofence ${geofenceName} (REQUIRED STAY)`;
    default:
      return `PELANGGARAN: ${vehicleName} pada ${geofenceName}`;
  }
}

/**
 * Menentukan apakah event merupakan violation berdasarkan rule_type geofence
 * @param {string} eventType - Tipe event (enter/exit)
 * @param {string} ruleType - Rule type geofence (STAY_IN/FORBIDDEN)
 * @returns {Object} - Tipe violation dan status
 */
export function getViolationType(eventType, ruleType) {
  // STAY_IN: kendaraan harus tetap di dalam, keluar = violation_exit
  // FORBIDDEN: area terlarang, masuk = violation_enter
  
  if (ruleType === 'STAY_IN' && eventType === 'exit') {
    return {
      isViolation: true,
      violationType: 'violation_exit'
    };
  }
  
  if (ruleType === 'FORBIDDEN' && eventType === 'enter') {
    return {
      isViolation: true,
      violationType: 'violation_enter'
    };
  }
  
  return {
    isViolation: false,
    violationType: null
  };
}

/**
 * Handler lengkap untuk menangani geofence violation
 * @param {Object} params - Parameter violation
 * @param {string} params.eventType - enter/exit
 * @param {Object} params.vehicle - Data kendaraan
 * @param {Object} params.geofence - Data geofence
 * @param {string} params.timestamp - Timestamp event
 * @returns {Promise<Object>} - Result dari penyimpanan
 */
export async function handleGeofenceViolation({
  eventType,
  vehicle,
  geofence,
  timestamp
}) {
  try {
    const { isViolation, violationType } = getViolationType(eventType, geofence.rule_type || 'STAY_IN');
    
    // Hanya proses jika ini adalah violation
    if (!isViolation) {
      return {
        success: true,
        isViolation: false
      };
    }
    
    // Data untuk alert violation
    const alertData = {
      vehicle_id: vehicle.vehicle_id,
      alert_type: violationType,
      alert_message: generateAlertMessage(violationType, vehicle, geofence),
      lokasi: vehicle.position ? `${vehicle.position.lat}, ${vehicle.position.lng}` : null,
      timestamp: timestamp
    };

    console.log('🔔 Processing geofence violation:', {
      eventType: violationType,
      vehicle: vehicle.vehicle_name || vehicle.name,
      geofence: geofence.name,
      ruleType: geofence.rule_type
    });
    
    // Simpan alert
    const alertResult = await saveAlert(alertData);

    return {
      success: true,
      alert: alertResult,
      isViolation: true
    };

  } catch (error) {
    console.error('Error handling geofence violation:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 