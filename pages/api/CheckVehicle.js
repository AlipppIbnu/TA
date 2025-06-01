import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { vehicle_id } = req.query;

  if (!vehicle_id) {
    return res.status(400).json({ message: 'Vehicle ID is required' });
  }

  try {
    // Cek vehicle_id secara global, tanpa memperhatikan user_id
    const response = await fetch(
      `${directusConfig.endpoints.vehicles}?filter[vehicle_id][_eq]=${encodeURIComponent(vehicle_id)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check vehicle');
    }

    const data = await response.json();
    const exists = data.data && data.data.length > 0;

    // Jika vehicle_id sudah ada, berikan informasi tambahan
    if (exists) {
      return res.status(200).json({ 
        exists: true,
        message: 'Vehicle ID sudah digunakan oleh pengguna lain'
      });
    }

    return res.status(200).json({ 
      exists: false,
      message: 'Vehicle ID tersedia'
    });
  } catch (error) {
    console.error('Error checking vehicle:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 