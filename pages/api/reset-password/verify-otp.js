import redisClient from '../../../lib/redis.js';
import { checkRateLimit } from '../../../lib/rate-limit.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('🔍 Reset Password Verify OTP Request:', {
    method: req.method,
    body: req.body,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'connection': req.connection?.remoteAddress
    }
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Rate limiting untuk verifikasi OTP
  if (!checkRateLimit(`verify_${clientIP}`, 5, 600000)) {
    return res.status(429).json({ 
      message: 'Terlalu banyak percobaan verifikasi. Coba lagi dalam 10 menit.' 
    });
  }

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email dan OTP diperlukan' });
  }

  // Validasi format OTP (6 digit)
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'Format OTP tidak valid' });
  }

  try {
    try {
      // Ambil OTP dari Redis
      const redisKey = `reset_${email}`;
      console.log('📦 Checking Redis key:', redisKey);
      
      const storedOtp = await redisClient.get(redisKey);
      console.log('🔐 OTP comparison:', {
        storedOtp,
        storedType: typeof storedOtp,
        receivedOtp: otp,
        receivedType: typeof otp,
        redisKey
      });

      if (!storedOtp) {
        console.log('❌ No OTP found in Redis');
        return res.status(400).json({ 
          message: 'Kode OTP telah kedaluwarsa atau tidak ditemukan',
          expired: true 
        });
      }

      // Convert both to string for comparison
      const storedOtpString = String(storedOtp);
      const receivedOtpString = String(otp);
      
      if (storedOtpString !== receivedOtpString) {
        console.log('❌ OTP mismatch:', { stored: storedOtpString, received: receivedOtpString });
        return res.status(400).json({ message: 'Kode OTP tidak valid' });
      }

      // Generate reset token untuk langkah selanjutnya
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      try {
        // Store reset token dengan expiry 5 menit
        await redisClient.setex(`reset_token_${email}`, 300, resetToken);
        
        // Hapus OTP setelah verifikasi berhasil
        await redisClient.del(`reset_${email}`);

        return res.status(200).json({ 
          message: 'Kode OTP berhasil diverifikasi',
          resetToken,
          success: true 
        });
      } catch (redisError) {
        console.error('Redis operation error:', redisError);
        return res.status(500).json({ 
          message: 'Terjadi kesalahan saat menyimpan token. Silakan coba lagi.' 
        });
      }
    } catch (redisError) {
      console.error('Redis get OTP error:', redisError);
      return res.status(500).json({ 
        message: 'Layanan sementara tidak tersedia. Silakan coba lagi dalam beberapa saat.' 
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan saat memverifikasi OTP' 
    });
  }
}