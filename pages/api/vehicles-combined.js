import directusConfig from '../../lib/directusConfig';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'get':
      return handleGetVehicles(req, res);
    case 'add':
      return handleAddVehicle(req, res);
    case 'delete':
      return handleDeleteVehicle(req, res);
    case 'check-license':
      return handleCheckLicense(req, res);
    case 'check-gps':
      return handleCheckGps(req, res);
    case 'update-geofence':
      return handleUpdateGeofence(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action. Use: get, add, delete, check-license, check-gps, update-geofence' });
  }
}

// GET VEHICLES HANDLER
async function handleGetVehicles(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch vehicles for current user
    const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${userId}`;
    const vehiclesResponse = await fetch(vehiclesUrl, {
      headers: directusConfig.headers
    });

    if (!vehiclesResponse.ok) {
      return res.status(500).json({ error: `Failed to fetch vehicles: ${vehiclesResponse.status} ${vehiclesResponse.statusText}` });
    }

    const vehiclesData = await vehiclesResponse.json();

    // Get vehicles array
    const vehicles = vehiclesData.data || [];

    // For each vehicle, fetch its latest position data using gps_id
    const vehiclesWithPositions = await Promise.all(
      vehicles.map(async (vehicle) => {
        if (!vehicle.gps_id) {
          return { ...vehicle, position: null };
        }

        try {
          // Fetch latest vehicle data for this gps_id
          const vehicleDataUrl = `${directusConfig.baseURL}/items/vehicle_datas?filter[gps_id][_eq]=${vehicle.gps_id}&sort=-timestamp&limit=1`;
          const vehicleDataResponse = await fetch(vehicleDataUrl, {
            headers: directusConfig.headers
          });

          const vehicleData = await vehicleDataResponse.json();

          if (vehicleData.data && vehicleData.data.length > 0) {
            const latestData = vehicleData.data[0];

            return {
              ...vehicle,
              position: {
                lat: parseFloat(latestData.latitude),
                lng: parseFloat(latestData.longitude),
                timestamp: latestData.timestamp
              }
            };
          } else {
            return { ...vehicle, position: null };
          }
        } catch {
          return { ...vehicle, position: null };
        }
      })
    );

    return res.status(200).json({ success: true, data: vehiclesWithPositions });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ADD VEHICLE HANDLER
async function handleAddVehicle(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      license_plate,
      name, 
      merek, 
      model, 
      tahun_pembuatan,
      sim_card_number,
      gps_id,
      user_id
    } = req.body;
    
    if (!user_id) {
      return res.status(401).json({ message: 'User ID required' });
    }
    
    if (!license_plate || !name || !merek || !model || !tahun_pembuatan) {
      return res.status(400).json({ message: 'Semua field wajib harus diisi' });
    }

    const directusData = {
      user_id: user_id,
      gps_id: gps_id || null,
      license_plate: license_plate,
      name: name,
      make: merek,
      model: model,
      year: parseInt(tahun_pembuatan),
      sim_card_number: sim_card_number || null,
      relay_status: "ON",
      create_at: new Date().toISOString(),
      update_at: new Date().toISOString(),
      vehicle_photo: null,
      geofence_id: null
    };

    const response = await fetch(directusConfig.endpoints.vehicles, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(directusData),
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ 
        message: 'Gagal tambah kendaraan ke database', 
        status: response.status
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        message: 'Respons bukan format JSON valid'
      });
    }

    res.status(200).json({ 
      message: `Kendaraan ${merek} ${model} berhasil ditambahkan!`, 
      data: data.data || data,
      success: true
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message,
      success: false
    });
  }
}

// DELETE VEHICLE HANDLER
async function handleDeleteVehicle(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vehicleId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'Vehicle ID is required' });
    }

    const response = await fetch(`${directusConfig.endpoints.vehicles}/${vehicleId}`, {
      method: 'DELETE',
      headers: directusConfig.headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.errors?.[0]?.message || 'Failed to delete vehicle' });
    }

    return res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// CHECK LICENSE PLATE HANDLER
async function handleCheckLicense(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { license_plate } = req.query;

  if (!license_plate) {
    return res.status(400).json({ message: 'License plate is required' });
  }

  try {
    // Cek license_plate secara global, tanpa memperhatikan user_id
    const response = await fetch(
      `${directusConfig.endpoints.vehicles}?filter[license_plate][_eq]=${encodeURIComponent(license_plate)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check vehicle');
    }

    const data = await response.json();
    const exists = data.data && data.data.length > 0;

    // Jika license_plate sudah ada, berikan informasi tambahan
    if (exists) {
      return res.status(200).json({ 
        exists: true,
        message: 'Nomor plat sudah digunakan oleh pengguna lain'
      });
    }

    return res.status(200).json({ 
      exists: false,
      message: 'Nomor plat tersedia'
    });
  } catch (error) {
    console.error('Error checking vehicle:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

// CHECK GPS DEVICE HANDLER
async function handleCheckGps(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { gps_id } = req.query;

    if (!gps_id) {
      return res.status(400).json({ message: 'GPS Device ID is required' });
    }

    // Cek GPS device ID secara global, tanpa memperhatikan user_id
    const response = await fetch(
      `${directusConfig.endpoints.vehicles}?filter[gps_id][_eq]=${encodeURIComponent(gps_id)}`,
      {
        headers: directusConfig.headers
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check GPS device ID');
    }

    const data = await response.json();
    
    // Jika ada data, berarti GPS device ID sudah digunakan
    const isExist = data.data && data.data.length > 0;

    return res.status(200).json({
      exists: isExist,
      message: isExist ? 'GPS Device ID sudah digunakan oleh kendaraan lain' : 'GPS Device ID tersedia'
    });

  } catch (error) {
    console.error('Error checking GPS device ID:', error);
    return res.status(500).json({
      message: 'Failed to check GPS device ID',
      error: error.message
    });
  }
}

// UPDATE VEHICLE GEOFENCE HANDLER
async function handleUpdateGeofence(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicle_id, geofence_id } = req.body;

    // Validasi input
    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        message: 'Field vehicle_id wajib diisi'
      });
    }

    // Siapkan data untuk update
    const updateData = {
      geofence_id: geofence_id || null // Null untuk menghapus asosiasi
    };

    // Update vehicle di Directus
    const response = await fetch(`${directusConfig.baseURL}/items/vehicle/${vehicle_id}`, {
      method: 'PATCH',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        message: geofence_id 
          ? `Vehicle ${vehicle_id} berhasil dikaitkan dengan geofence ${geofence_id}`
          : `Vehicle ${vehicle_id} berhasil dilepas dari geofence`,
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
        message: errorData.message || 'Gagal update vehicle geofence',
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