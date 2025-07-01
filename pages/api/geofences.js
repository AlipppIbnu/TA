// pages/api/geofences.js - API untuk mengambil data geofences
import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
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