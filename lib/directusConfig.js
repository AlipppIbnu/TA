const DIRECTUS_URL = 'http://vehitrack.my.id/directus';

const directusConfig = {
  baseURL: DIRECTUS_URL,
  endpoints: {
    auth: `${DIRECTUS_URL}/auth`,
    users: `${DIRECTUS_URL}/items/users`,
    vehicles: 'http://vehitrack.my.id/directus/items/vehicle',
    vehicleData: 'http://vehitrack.my.id/directus/items/vehicle_datas',
    commands: `${DIRECTUS_URL}/items/commands`,
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