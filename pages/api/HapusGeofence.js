import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  // Verifikasi method request
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