// utils/geofenceApi.js - Utility functions untuk mengirim data geofence events dan alerts

/**
 * Ambil alerts dari Directus melalui API lokal
 * @param {Object} params - Parameter query
 * @param {number} params.limit - Jumlah alerts yang akan diambil
 * @param {string} params.sort - Urutan pengurutan
 * @param {number} params.since_id - Ambil alerts sejak ID ini
 * @returns {Promise<Object>} - Response dari API
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
  // Hanya simpan alert untuk pelanggaran
  if (alertData.alert_type !== 'violation_enter' && alertData.alert_type !== 'violation_exit') {
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
      // Ini tidak seharusnya terjadi dengan filtering baru, tapi sebagai jaga-jaga
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
      user_id: user_id // Tambahkan user_id untuk validasi API
    };

    // Simpan alert (hanya untuk violation - difilter di fungsi saveAlert)
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