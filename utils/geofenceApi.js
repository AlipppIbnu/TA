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
 * @param {string} eventType - Tipe event (violation_enter, violation_exit, enter, exit)
 * @param {Object} vehicleData - Data kendaraan
 * @param {Object} geofenceData - Data geofence
 * @returns {string} - Alert message
 */
export function generateAlertMessage(eventType, vehicleData, geofenceData) {
  const vehicleName = vehicleData.vehicle_name || 'Kendaraan';
  const geofenceName = geofenceData.geofence_name || 'area geofence';
  
  switch (eventType) {
    case 'violation_enter':
      return `PELANGGARAN: ${vehicleName} memasuki geofence ${geofenceName} (FORBIDDEN)`;
    case 'violation_exit':
      return `PELANGGARAN: ${vehicleName} keluar dari geofence ${geofenceName} (REQUIRED STAY)`;
    case 'enter':
      return `INFO: ${vehicleName} memasuki geofence ${geofenceName}`;
    case 'exit':
      return `INFO: ${vehicleName} keluar dari geofence ${geofenceName}`;
    default:
      return `Event ${eventType}: ${vehicleName} pada ${geofenceName}`;
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
    const isViolationEvent = isViolation(eventType, geofence.rule_type || 'STAY_IN');
    const finalEventType = isViolationEvent ? `violation_${eventType}` : eventType;
    
    // Data untuk geofence event
    const geofenceEventData = {
      vehicle_id: vehicle.vehicle_id,
      geofence_id: geofence.geofence_id || geofence.id,
      event: finalEventType,
      event_timestamp: timestamp
    };
    
    // Data untuk alert (hanya untuk violation atau event penting)
    const alertData = {
      vehicle_id: vehicle.vehicle_id,
      alert_type: finalEventType,
      alert_message: generateAlertMessage(finalEventType, vehicle, geofence),
      lokasi: vehicle.position ? `${vehicle.position.lat}, ${vehicle.position.lng}` : null,
      timestamp: timestamp
    };

    console.log('🔔 Processing geofence violation:', {
      eventType: finalEventType,
      vehicle: vehicle.vehicle_name || vehicle.name,
      geofence: geofence.name,
      ruleType: geofence.rule_type,
      isViolation: isViolationEvent
    });

    // Simpan geofence event
    const eventResult = await saveGeofenceEvent(geofenceEventData);
    
    // Simpan alert
    const alertResult = await saveAlert(alertData);

    return {
      success: true,
      geofenceEvent: eventResult,
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