// pages/api/auth/verifyOTP.js
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  console.log('🔍 Verify OTP API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp, userId } = req.body;
  console.log('📨 Verify request:', { email, otp, userId });

  if (!email || !otp || !userId) {
    return res.status(400).json({ 
      success: false,
      message: 'Email, OTP, and userId are required' 
    });
  }

  try {
    // Create OTP key that matches generation
    const otpKey = `otp:${userId}:${email}`;
    console.log('🔑 Looking for OTP key:', otpKey);
    
    // Get stored OTP from Redis
    const storedOtp = await redis.get(otpKey);
    console.log('💾 Stored OTP:', storedOtp);
    console.log('📝 Submitted OTP:', otp);

    if (!storedOtp) {
      console.log('❌ OTP not found or expired');
      return res.status(400).json({ 
        success: false,
        message: 'Kode OTP sudah expired atau tidak ditemukan' 
      });
    }

    // Normalize both values to strings and trim whitespace
    const normalizedStored = String(storedOtp).trim();
    const normalizedSubmitted = String(otp).trim();
    
    console.log('🔄 Normalized comparison:');
    console.log('  Stored:', `"${normalizedStored}" (length: ${normalizedStored.length})`);
    console.log('  Submitted:', `"${normalizedSubmitted}" (length: ${normalizedSubmitted.length})`);
    console.log('  Match:', normalizedStored === normalizedSubmitted);

    if (normalizedStored !== normalizedSubmitted) {
      console.log('❌ OTP mismatch');
      return res.status(400).json({ 
        success: false,
        message: 'Kode OTP tidak valid' 
      });
    }

    // OTP is valid, remove it from Redis
    const deleteResult = await redis.del(otpKey);
    console.log('🗑️ OTP deleted from Redis:', deleteResult);

    // If using Directus native auth, retrieve temporary tokens
    const tempTokenKey = `temp_tokens:${userId}`;
    const tempData = await redis.get(tempTokenKey);
    
    let userData = null;
    if (tempData) {
      const parsedData = JSON.parse(tempData);
      userData = {
        ...parsedData.user_data,
        access_token: parsedData.access_token,
        refresh_token: parsedData.refresh_token
      };
      
      // Delete temporary tokens
      await redis.del(tempTokenKey);
      console.log('🗑️ Temporary tokens deleted from Redis');
    }

    console.log('✅ OTP verified successfully');

    return res.status(200).json({ 
      success: true,
      message: 'OTP berhasil diverifikasi',
      userData: userData // Include user data if using Directus auth
    });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Gagal memverifikasi OTP: ' + error.message 
    });
  }
}