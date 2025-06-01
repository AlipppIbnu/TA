import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { gps_device_id } = req.query;

    if (!gps_device_id) {
      return res.status(400).json({ message: 'GPS Device ID is required' });
    }

    // Cek GPS device ID secara global, tanpa memperhatikan user_id
    const response = await fetch(
      `${directusConfig.endpoints.vehicles}?filter[gps_device_id][_eq]=${encodeURIComponent(gps_device_id)}`,
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