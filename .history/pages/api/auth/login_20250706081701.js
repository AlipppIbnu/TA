// pages/api/auth/login.js

import { Redis } from "@upstash/redis";

// Initialize Upstash Redis for device storage
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Mock user database - replace with your actual database
const users = [
  {
    id: "user-123",
    email: "admin@example.com",
    password: "password123", // In production, use bcrypt or similar
    name: "Admin User",
    role: "admin"
  }
];

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
    // Find user (replace with database query)
    const user = users.find(u => u.email === email);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if device is recognized
    let requireOtp = true;
    
    if (deviceId) {
      // Check if this device is registered for this user
      const deviceKey = `device:${user.id}:${deviceId}`;
      const deviceData = await redis.get(deviceKey);
      
      if (deviceData) {
        requireOtp = false;
        
        // Update last used timestamp
        await redis.setex(deviceKey, 2592000, JSON.stringify({
          ...JSON.parse(deviceData),
          lastUsed: new Date().toISOString()
        }));
      }
    }

    // If device is recognized, return success without OTP
    if (!requireOtp) {
      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;
      
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
      userId: user.id,
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