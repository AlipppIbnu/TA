import directusConfig from './directusConfig';
import { getCurrentUser } from './authService';

// Add new vehicle
export const addVehicle = async (vehicleData) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const dataWithUserId = {
      ...vehicleData,
      user_id: user.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await fetch(directusConfig.endpoints.vehicles, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataWithUserId),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', error);
      throw new Error(`Failed to add vehicle: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    return responseData.data || responseData;
  } catch (error) {
    console.error('Error adding vehicle:', error);
    throw error;
  }
};

// Delete vehicle
export const deleteVehicle = async (vehicleId) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${directusConfig.endpoints.vehicles}/${vehicleId}`, {
      method: 'DELETE',
      headers: directusConfig.headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to delete vehicle');
    }

    return true;
  } catch (error) {
    throw new Error(error.message || 'Failed to delete vehicle');
  }
};

// Get all vehicles for current user
export const getUserVehicles = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch vehicles for current user
    const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user.userId}`;
    const vehiclesResponse = await fetch(vehiclesUrl, {
      headers: directusConfig.headers
    });

    if (!vehiclesResponse.ok) {
      throw new Error(`Failed to fetch vehicles: ${vehiclesResponse.status} ${vehiclesResponse.statusText}`);
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
        } catch (error) {
          console.error(`Failed to fetch vehicle data for ${vehicle.vehicle_id}:`, vehicleDataResponse.status);
          return { ...vehicle, position: null };
        }
      })
    );

    return vehiclesWithPositions;
  } catch (error) {
    console.error(`Error fetching data for vehicle ${vehicle.vehicle_id}:`, error);
    throw error;
  }
}; 