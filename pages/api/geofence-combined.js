import directusConfig from '../../lib/directusConfig';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'get':
      return handleGetGeofences(req, res);
    case 'add':
      return handleAddGeofence(req, res);
    case 'delete':
      return handleDeleteGeofence(req, res);
    case 'add-event':
      return handleAddGeofenceEvent(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action. Use: get, add, delete, add-event' });
  }
}

// GET GEOFENCES HANDLER
async function handleGetGeofences(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${directusConfig.baseURL}/items/geofence`, {
      headers: directusConfig.headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch geofences: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      data: data.data || [],
      message: 'Geofences loaded successfully'
    });
    
  } catch (error) {
    console.error('Error fetching geofences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch geofences',
      error: error.message
    });
  }
}

// ADD GEOFENCE HANDLER
async function handleAddGeofence(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, type, definition, rule_type, status, vehicle_id, user_id } = req.body;

    // Validasi input
    if (!name || !type || !definition) {
      return res.status(400).json({
        success: false,
        message: 'Field name, type, dan definition wajib diisi'
      });
    }

    // Validasi definition sebagai object
    if (typeof definition !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Definition harus berupa object GeoJSON'
      });
    }

    // Siapkan data untuk Directus - TANPA vehicle_id
    const directusData = {
      name: name,
      type: type, // Simpan type asli (polygon/multipolygon)
      definition: JSON.stringify(definition),
      rule_type: rule_type || 'STAY_IN',
      status: status || 'active',
      user_id: user_id && user_id !== "" ? user_id : null,
      date_created: new Date().toISOString()
    };

    // Kirim ke Directus untuk membuat geofence
    const response = await fetch(`${directusConfig.baseURL}/items/geofence`, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(directusData)
    });

    if (response.ok) {
      const data = await response.json();
      const newGeofenceId = data.data.geofence_id;

      // Jika ada vehicle_id, update vehicle dengan geofence_id yang baru dibuat
      if (vehicle_id && vehicle_id !== "") {
        try {
          const updateVehicleResponse = await fetch(`${directusConfig.baseURL}/items/vehicle/${vehicle_id}`, {
            method: 'PATCH',
            headers: {
              ...directusConfig.headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              geofence_id: newGeofenceId
            })
          });

          if (!updateVehicleResponse.ok) {
            console.error('Failed to update vehicle with geofence_id');
            // Tidak throw error, karena geofence sudah berhasil dibuat
          }
        } catch (updateError) {
          console.error('Error updating vehicle:', updateError);
          // Tidak throw error, karena geofence sudah berhasil dibuat
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Geofence "${name}" berhasil dibuat${vehicle_id ? ' dan dikaitkan dengan kendaraan' : ''}`,
        data: data.data
      });
    } else {
      // Handle error response
      const responseText = await response.text();
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Gagal membuat geofence',
        detail: errorData
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// DELETE GEOFENCE HANDLER
async function handleDeleteGeofence(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { geofence_id } = req.query;

    // Validasi input
    if (!geofence_id) {
      return res.status(400).json({
        success: false,
        message: 'Geofence ID wajib diisi'
      });
    }

    // 1. Cari vehicle yang menggunakan geofence ini dan update jadi null
    try {
      const vehiclesResponse = await fetch(
        `${directusConfig.baseURL}/items/vehicle?filter[geofence_id][_eq]=${geofence_id}`,
        {
          headers: directusConfig.headers
        }
      );

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        
        // Update semua vehicle yang menggunakan geofence ini
        if (vehiclesData.data && vehiclesData.data.length > 0) {
          const updatePromises = vehiclesData.data.map(vehicle => 
            fetch(`${directusConfig.baseURL}/items/vehicle/${vehicle.vehicle_id}`, {
              method: 'PATCH',
              headers: {
                ...directusConfig.headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ geofence_id: null })
            })
          );

          await Promise.all(updatePromises);
        }
      }
    } catch (updateError) {
      console.error('Error updating vehicles:', updateError);
      // Lanjutkan hapus geofence meskipun update vehicle gagal
    }

    // 2. Hapus geofence dari Directus
    const deleteResponse = await fetch(`${directusConfig.baseURL}/items/geofence/${geofence_id}`, {
      method: 'DELETE',
      headers: directusConfig.headers
    });

    if (deleteResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'Geofence berhasil dihapus dan asosiasi kendaraan telah diperbarui'
      });
    } else {
      // Handle error response
      const responseText = await deleteResponse.text();
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      return res.status(deleteResponse.status).json({
        success: false,
        message: errorData.message || 'Gagal menghapus geofence',
        detail: errorData
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// ADD GEOFENCE EVENT HANDLER
async function handleAddGeofenceEvent(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicle_id, geofence_id, event, event_timestamp } = req.body;

    // Validasi input
    if (!vehicle_id || !geofence_id || !event) {
      return res.status(400).json({
        success: false,
        message: 'Field vehicle_id, geofence_id, dan event wajib diisi'
      });
    }

    // Siapkan data untuk Directus
    const directusData = {
      vehicle_id: vehicle_id,
      geofence_id: geofence_id,
      event: event, // enter, exit, violation_enter, violation_exit
      event_timestamp: event_timestamp || new Date().toISOString()
    };

    console.log('📍 Menyimpan geofence event:', directusData);

    // Kirim ke Directus
    const response = await fetch(`${directusConfig.baseURL}/items/geofence_events`, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(directusData)
    });

    if (response.ok) {
      const data = await response.json();
      
      console.log('✅ Geofence event berhasil disimpan:', data);
      
      return res.status(200).json({
        success: true,
        message: 'Geofence event berhasil disimpan',
        data: data.data
      });
    } else {
      // Handle error response
      const responseText = await response.text();
      
      console.error("❌ Directus error response:", responseText);
      console.error("❌ Response status:", response.status);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error("❌ Parsed error data:", errorData);
      } catch {
        console.error("❌ Could not parse error response as JSON");
        errorData = { message: responseText };
      }

      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Gagal menyimpan geofence event',
        detail: errorData
      });
    }

  } catch (error) {
    console.error("❌ API Error:", error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
} 