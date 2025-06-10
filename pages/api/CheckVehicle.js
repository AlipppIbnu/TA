import directusConfig from '@/lib/directusConfig';

export default async function handler(req, res) {
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