// pages/api/auth/registerDevice.js

import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from 'uuid';

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, userAgent } = req.body;

  if (!userId) {
    return res.status(400).json({ 
      success: false,
      message: 'UserId is required' 
    });
  }

  try {
    // Generate unique device ID
    const deviceId = uuidv4();
    
    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress;

    // Device data to store
    const deviceData = {
      id: deviceId,
      userId: userId,
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: ipAddress,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    // Store device in Redis with 30 days expiration
    const deviceKey = `device:${userId}:${deviceId}`;
    await redis.setex(deviceKey, 2592000, JSON.stringify(deviceData)); // 30 days in seconds

    // Also maintain a list of devices per user (optional)
    const userDevicesKey = `user_devices:${userId}`;
    const existingDevices = await redis.get(userDevicesKey) || [];
    
    // Add new device to list (keep max 10 devices)
    const updatedDevices = [
      {
        id: deviceId,
        name: parseUserAgent(userAgent),
        lastUsed: new Date().toISOString()
      },
      ...existingDevices.slice(0, 9)
    ];
    
    await redis.setex(userDevicesKey, 2592000, JSON.stringify(updatedDevices));

    return res.status(200).json({
      success: true,
      deviceId: deviceId,
      message: 'Device registered successfully'
    });

  } catch (error) {
    console.error('Device registration error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to register device' 
    });
  }
}

// Helper function to parse user agent into readable device name
function parseUserAgent(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  // Simple parsing - you can use a library like 'ua-parser-js' for better results
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  
  return 'Web Browser';
}