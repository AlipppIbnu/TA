import Redis from 'ioredis';

let redis;

// Konfigurasi Redis dengan ioredis
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });
} else {
  throw new Error('REDIS_URL tidak ditemukan di environment variables');
}

// REST API Redis untuk serverless functions
export const restRedis = {
  async set(key, value, ex = null) {
    const body = ex ? 
      JSON.stringify(['SET', key, value, 'EX', ex]) : 
      JSON.stringify(['SET', key, value]);
    
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    
    return response.json();
  },

  async get(key) {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });
    
    const data = await response.json();
    return data.result;
  },

  async del(key) {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', key]),
    });
    
    return response.json();
  },

  async setex(key, seconds, value) {
    return this.set(key, value, seconds);
  }
};

export default redis; 