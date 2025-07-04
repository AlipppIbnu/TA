// pages/api/HapusKendaraan.js
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const id = req.query.id || req.body.id;
    const { user_id } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'ID kendaraan diperlukan' });
    }

    // KEAMANAN: Memerlukan user_id untuk verifikasi kepemilikan
    if (!user_id) {
      return res.status(400).json({ message: 'User ID diperlukan' });
    }

    // First, find the vehicle record and verify user ownership
    const checkUrl = `${directusConfig.baseURL}/items/vehicle?filter[vehicle_id][_eq]=${id}&filter[user_id][_eq]=${user_id}`;
    
    const checkResponse = await fetch(checkUrl, {
      headers: directusConfig.headers
    });
    
    if (!checkResponse.ok) {
      return res.status(500).json({ 
        message: 'Gagal memeriksa kendaraan',
        error: `Check failed: ${checkResponse.status}`
      });
    }

    const checkData = await checkResponse.json();

    if (!checkData.data || checkData.data.length === 0) {
      return res.status(404).json({ 
        message: 'Kendaraan tidak ditemukan atau bukan milik user saat ini',
        receivedId: id
      });
    }

    // Get the actual Directus record ID (primary key)
    const vehicleRecord = checkData.data[0];
    const directusId = vehicleRecord.id || vehicleRecord.vehicle_id;

    // URL untuk menghapus data di Directus using the correct ID
    const directusUrl = `${directusConfig.baseURL}/items/vehicle/${directusId}`;

    // Kirim request DELETE ke Directus
    const response = await fetch(directusUrl, {
      method: 'DELETE',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `Failed to delete: ${response.status} ${response.statusText}`;
      
      try {
        const errorText = await response.text();
        errorMessage += ` - ${errorText}`;
      } catch {
        // Could not read error text
      }
      
      return res.status(response.status).json({ 
        message: 'Gagal menghapus kendaraan dari database',
        error: errorMessage
      });
    }

    res.status(200).json({ 
      message: 'Kendaraan berhasil dihapus!',
      success: true
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Terjadi kesalahan internal server', 
      error: error.message 
    });
  }
}