import directusConfig from './directusConfig';
import { getCurrentUser } from './authService';

// Tambah kendaraan baru
export const addVehicle = async (vehicleData) => {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated - please login first');
    }

    // Petakan data form ke format yang diharapkan API
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

    const response = await fetch('/api/TambahKendaraan', {
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

// Hapus kendaraan
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

// Dapatkan semua kendaraan untuk pengguna saat ini
export const getUserVehicles = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ambil kendaraan untuk pengguna saat ini
    const vehiclesUrl = `${directusConfig.baseURL}/items/vehicle?filter[user_id][_eq]=${user.userId}`;
    const vehiclesResponse = await fetch(vehiclesUrl, {
      headers: directusConfig.headers
    });

    if (!vehiclesResponse.ok) {
      throw new Error(`Failed to fetch vehicles: ${vehiclesResponse.status} ${vehiclesResponse.statusText}`);
    }

    const vehiclesData = await vehiclesResponse.json();

    // Dapatkan array kendaraan
    const vehicles = vehiclesData.data || [];

    // Untuk setiap kendaraan, ambil data posisi terbaru menggunakan gps_id
    const vehiclesWithPositions = await Promise.all(
      vehicles.map(async (vehicle) => {
        if (!vehicle.gps_id) {
          return { ...vehicle, position: null };
        }

        try {
          // Ambil data kendaraan terbaru untuk gps_id ini
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

    return vehiclesWithPositions;
  } catch (error) {
    throw error;
  }
}; 