import directusConfig from '../../../lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch vehicles for current user
    const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${userId}`;
    const vehiclesResponse = await fetch(vehiclesUrl, {
      headers: directusConfig.headers
    });

    if (!vehiclesResponse.ok) {
      return res.status(500).json({ error: `Failed to fetch vehicles: ${vehiclesResponse.status} ${vehiclesResponse.statusText}` });
    }

    const vehiclesData = await vehiclesResponse.json();

    // Get vehicles array
    const vehicles = vehiclesData.data || [];

    // For each vehicle, fetch its latest position data using gps_id
    const vehiclesWithPositions = await Promise.all(
      vehicles.map(async (vehicle) => {
        if (!vehicle.gps_id) {
          return { ...vehicle, position: null };
        }

        try {
          // Fetch latest vehicle data for this gps_id
          const vehicleDataUrl = `${directusConfig.baseURL}/items/vehicle_datas?filter[gps_id][_eq]=${vehicle.gps_id}&sort=-timestamp&limit=1`;
          const vehicleDataResponse = await fetch(vehicleDataUrl, {
            headers: directusConfig.headers
          });

          const vehicleData = await vehicleDataResponse.json();

          if (vehicleData.data && vehicleData.data.length > 0) {
            const latestData = vehicleData.data[0];

            return {
              ...vehicle,
              position: {
                lat: parseFloat(latestData.latitude),
                lng: parseFloat(latestData.longitude),
                timestamp: latestData.timestamp
              }
            };
          } else {
            return { ...vehicle, position: null };
          }
        } catch {
          return { ...vehicle, position: null };
        }
      })
    );

    return res.status(200).json({ success: true, data: vehiclesWithPositions });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 