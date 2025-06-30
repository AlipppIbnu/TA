import { getCurrentUser } from './authService';

// Add new vehicle
export const addVehicle = async (vehicleData) => {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated - please login first');
    }

    // Map form data to API expected format
    const apiData = {
      license_plate: vehicleData.license_plate,
      name: vehicleData.name,
      merek: vehicleData.make,
      model: vehicleData.model,
      tahun_pembuatan: vehicleData.year,
      sim_card_number: vehicleData.sim_card_number || null,
      gps_id: vehicleData.gps_id || null,
      user_id: user.userId
    };

    const response = await fetch('/api/vehicles?action=add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      await response.text();
      throw new Error(`Failed to add vehicle: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    return responseData.data || responseData;
  } catch (error) {
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

    const response = await fetch('/api/vehicles?action=delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicleId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete vehicle');
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

    const response = await fetch(`/api/vehicles?action=get&userId=${user.userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
          });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch vehicles');
        }

    return result.data;
  } catch (error) {
    throw error;
  }
}; 