const DIRECTUS_URL = 'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055';

const directusConfig = {
  baseURL: DIRECTUS_URL,
  endpoints: {
    auth: `${DIRECTUS_URL}/auth`,
    users: `${DIRECTUS_URL}/items/users`,
    vehicles: 'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055/items/vehicle',
    vehicleData: 'http://ec2-13-229-83-7.ap-southeast-1.compute.amazonaws.com:8055/items/vehicle_datas',
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