// pages/api/auth/login.js

import { Redis } from "@upstash/redis";
import directusConfig from "../../../lib/directusConfig";
import bcrypt from 'bcryptjs';

// Initialize Upstash Redis for device storage
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Email and password are required' 
    });
  }

  try {
    // Find user from Directus
    const searchResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: directusConfig.headers,
      }
    );

    if (!searchResponse.ok) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to search user' 
      });
    }

    const searchResult = await searchResponse.json();
    
    if (!searchResult.data || searchResult.data.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const user = searchResult.data[0];

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if device is recognized
    let requireOtp = true;
    
    if (deviceId) {
      // Check if this device is registered for this user
      const deviceKey = `device:${user.users_id}:${deviceId}`;
      
      try {
        const deviceData = await redis.get(deviceKey);
        
        if (deviceData) {
          requireOtp = false;
          
          // Update last used timestamp
          // deviceData dari Redis bisa berupa string atau object
          let parsedDeviceData;
          if (typeof deviceData === 'string') {
            parsedDeviceData = JSON.parse(deviceData);
          } else {
            parsedDeviceData = deviceData;
          }
          
          await redis.setex(deviceKey, 2592000, JSON.stringify({
            ...parsedDeviceData,
            lastUsed: new Date().toISOString()
          }));
        }
      } catch (redisError) {
        console.error('Redis error:', redisError);
        // Continue with OTP requirement if Redis fails
        requireOtp = true;
      }
    }

    // If device is recognized, return success without OTP
    if (!requireOtp) {
      // Return user data without password_hash
      const { password_hash, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        success: true,
        requireOtp: false,
        user: userWithoutPassword
      });
    }

    // Device not recognized, require OTP
    return res.status(200).json({
      success: true,
      requireOtp: true,
      userId: user.users_id,
      message: 'OTP required for new device'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}