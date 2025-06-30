import directusConfig from '../../../lib/directusConfig';

export default async function handler(req, res) {
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