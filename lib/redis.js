// lib/redis.js - Konfigurasi Redis terpusat menggunakan Upstash
import { Redis } from "@upstash/redis";

// Create a single Redis instance to be reused
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Add error handling wrapper
export const redisClient = {
  async get(key) {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      throw error;
    }
  },

  async set(key, value, options = {}) {
    try {
      if (options.ex) {
        return await redis.setex(key, options.ex, value);
      }
      return await redis.set(key, value);
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  },

  async setex(key, seconds, value) {
    try {
      return await redis.setex(key, seconds, value);
    } catch (error) {
      console.error(`Redis SETEX error for key ${key}:`, error);
      throw error;
    }
  },

  async del(key) {
    try {
      return await redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      throw error;
    }
  },

  async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      throw error;
    }
  },

  async expire(key, seconds) {
    try {
      return await redis.expire(key, seconds);
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      throw error;
    }
  },

  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      throw error;
    }
  },

  // For list operations
  async lpush(key, ...values) {
    try {
      return await redis.lpush(key, ...values);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      throw error;
    }
  },

  async rpush(key, ...values) {
    try {
      return await redis.rpush(key, ...values);
    } catch (error) {
      console.error(`Redis RPUSH error for key ${key}:`, error);
      throw error;
    }
  },

  async lrange(key, start, stop) {
    try {
      return await redis.lrange(key, start, stop);
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error);
      throw error;
    }
  },

  async lrem(key, count, value) {
    try {
      return await redis.lrem(key, count, value);
    } catch (error) {
      console.error(`Redis LREM error for key ${key}:`, error);
      throw error;
    }
  },

  async rpoplpush(source, destination) {
    try {
      return await redis.rpoplpush(source, destination);
    } catch (error) {
      console.error(`Redis RPOPLPUSH error:`, error);
      throw error;
    }
  },

  async llen(key) {
    try {
      return await redis.llen(key);
    } catch (error) {
      console.error(`Redis LLEN error for key ${key}:`, error);
      throw error;
    }
  },

  // Raw redis instance if needed
  raw: redis
};

export default redisClient;