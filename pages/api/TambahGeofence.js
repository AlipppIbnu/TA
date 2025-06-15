// pages/api/TambahGeofence.js 
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  // Verifikasi method request
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