import directusConfig from '@/lib/directusConfig';

/**
 * API handler untuk kontrol relay kendaraan
 */
export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { relay_status } = req.body;
    
    // Validasi input
    if (!relay_status || !['ON', 'OFF'].includes(relay_status)) {
      return res.status(400).json({ 
        error: "relay_status harus berupa 'ON' atau 'OFF'" 
      });
    }

    // Get vehicle data
    const vehicleResponse = await fetch(
      `${directusConfig.endpoints.vehicles}/${id}`,
      { headers: directusConfig.headers }
    );
    
    if (!vehicleResponse.ok) {
      throw new Error('Vehicle not found');
    }
    
    const vehicleData = await vehicleResponse.json();
    const vehicle = vehicleData.data;

    // Kirim perintah ke relay fisik
    const relayCommand = await sendRelayCommand(vehicle, relay_status);
    
    if (!relayCommand.success) {
      // Fallback: update database saja dengan warning
      const dbUpdateResult = await updateDatabaseOnly(id, relay_status);
      
      return res.status(207).json({
        success: true,
        relay_command_sent: false,
        database_updated: dbUpdateResult.success,
        error: `Relay fisik tidak merespons: ${relayCommand.error}`,
        warning: "Status database telah diupdate, namun relay fisik mungkin belum menerima perintah.",
        message: `Status database berhasil diupdate ke ${relay_status}, tapi relay fisik belum terkonfirmasi`
      });
    }

    // Update database setelah relay sukses
    const dbUpdateResult = await updateDatabaseOnly(id, relay_status);
    
    if (dbUpdateResult.success) {
      // Async verification (no await, background process)
      setTimeout(() => verifyRelayStatus(vehicle, relay_status), 2000);
      
      return res.status(200).json({
        success: true,
        relay_command_sent: true,
        database_updated: true,
        data: dbUpdateResult.data,
        message: `Perintah ${relay_status} berhasil dikirim ke relay fisik dan database terupdate`
      });
    } else {
      return res.status(500).json({
        success: false,
        relay_command_sent: true,
        database_updated: false,
        error: "Relay fisik berhasil, tapi gagal update database"
      });
    }
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: "Failed to update vehicle relay status",
      details: error.message 
    });
  }
}

/**
 * Update database only
 */
async function updateDatabaseOnly(vehicleId, relay_status) {
  try {
    const response = await fetch(`${directusConfig.endpoints.vehicles}/${vehicleId}`, {
      method: 'PATCH',
      headers: directusConfig.headers,
      body: JSON.stringify({
        relay_status: relay_status,
        update_at: new Date().toISOString()
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send command to physical relay with retry mechanism
 */
async function sendRelayCommand(vehicle, relay_status) {
  try {
    const { retryAttempts, retryDelay, command: timeout } = directusConfig.relayTimeouts;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const relayPayload = {
          vehicle_id: vehicle.vehicle_id,
          gps_id: vehicle.gps_id,
          command: relay_status.toLowerCase(),
          timestamp: new Date().toISOString(),
          sim_card: vehicle.sim_card_number,
          license_plate: vehicle.license_plate
        };
        
        const relayResponse = await fetch(directusConfig.endpoints.relayControl, {
          method: 'POST',
          headers: directusConfig.headers,
          body: JSON.stringify(relayPayload),
          signal: AbortSignal.timeout(timeout)
        });
        
        if (relayResponse.ok) {
          const result = await relayResponse.json();
          return { success: true, attempt, result };
        }
        
        if (attempt === retryAttempts) {
          throw new Error(`Relay command failed after ${attempt} attempts: ${relayResponse.status}`);
        }
        
      } catch (attemptError) {
        if (attempt === retryAttempts) {
          throw attemptError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * retryDelay));
      }
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      details: 'Koneksi ke relay fisik mungkin terputus atau endpoint belum dikonfigurasi'
    };
  }
}

/**
 * Verify relay status (background process)
 */
async function verifyRelayStatus(vehicle, expectedStatus) {
  try {
    const statusResponse = await fetch(directusConfig.endpoints.relayStatus, {
      method: 'POST',
      headers: directusConfig.headers,
      body: JSON.stringify({
        vehicle_id: vehicle.vehicle_id,
        gps_id: vehicle.gps_id
      }),
      signal: AbortSignal.timeout(directusConfig.relayTimeouts.verification)
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const actualStatus = statusData.relay_status?.toUpperCase();
      return { success: true, matches: actualStatus === expectedStatus };
    }
    
    return { success: false, error: 'Verification failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 