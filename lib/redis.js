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
const handleRedisError = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    throw new Error('Layanan sementara tidak tersedia. Silakan coba lagi.');
  }
};

export const restRedis = {
  async set(key, value, ex = null) {
    return handleRedisError(async () => {
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
      
      if (!response.ok) {
        throw new Error(`Redis SET failed: ${response.statusText}`);
      }
      
      return response.json();
    });
  },

  async get(key) {
    return handleRedisError(async () => {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
      });
      
      if (!response.ok) {
        throw new Error(`Redis GET failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.result;
    });
  },

  async del(key) {
    return handleRedisError(async () => {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', key]),
      });
      
      if (!response.ok) {
        throw new Error(`Redis DEL failed: ${response.statusText}`);
      }
      
      return response.json();
    });
  },

  async setex(key, seconds, value) {
    return this.set(key, value, seconds);
  }
};

export default redis; 