// pages/api/geofences.js - API untuk mengambil data geofences
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;
    
    // KEAMANAN: Memerlukan user_id dari client yang terautentikasi
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID diperlukan'
      });
    }

    // Filter geofences berdasarkan user_id
    const url = `${directusConfig.baseURL}/items/geofence?filter[user_id][_eq]=${user_id}`;
    const response = await fetch(url, {
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