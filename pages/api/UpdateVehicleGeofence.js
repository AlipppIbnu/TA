import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  // Verifikasi method request
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
      } catch (e) {
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