const DIRECTUS_URL = 'https://vehitrack.my.id/directus';

const directusConfig = {
  baseURL: DIRECTUS_URL,
  endpoints: {
    auth: `${DIRECTUS_URL}/auth`,
    users: `${DIRECTUS_URL}/items/users`,
    vehicles: `${DIRECTUS_URL}/items/vehicle`,
    vehicleData: `${DIRECTUS_URL}/items/vehicle_datas`,
    relayControl: `${DIRECTUS_URL}/relay/control`,
    relayStatus: `${DIRECTUS_URL}/relay/status`,
  },
  headers: {
    'Content-Type': 'application/json',
  },
  relayTimeouts: {
    command: 10000,
    verification: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};

export default directusConfig; 