import { restRedis } from '../../../lib/redis.js';
import { sendOTPEmail } from '../../../lib/email.js';
import { checkRateLimit } from '../../../lib/rate-limit.js';
import directusConfig from '../../../lib/directusConfig.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Pembatasan rate limiting
  if (!checkRateLimit(clientIP, 5, 300000)) {
    return res.status(429).json({ 
      message: 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' 
    });
  }

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Validasi format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format email tidak valid' });
  }

  try {
    // Cek apakah email ada di database Directus
    const checkResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!checkResponse.ok) {
      console.error('Directus API error:', await checkResponse.text());
      return res.status(500).json({ message: 'Gagal memeriksa email' });
    }

    const checkResult = await checkResponse.json();
    if (!checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ message: 'Email tidak ditemukan dalam sistem' });
    }

    try {
      // Generate OTP 6 digit
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Simpan OTP di Redis dengan expiry 1 menit (60 detik)
      await restRedis.setex(`reset_${email}`, 60, otp);

      try {
        // Kirim email OTP
        await sendOTPEmail(email, otp);

        return res.status(200).json({ 
          message: 'Kode OTP telah dikirim ke email Anda',
          success: true 
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Hapus OTP jika gagal mengirim email
        await restRedis.del(`reset_${email}`);
        return res.status(500).json({ 
          message: 'Gagal mengirim email OTP. Silakan coba lagi.' 
        });
      }
    } catch (redisError) {
      console.error('Redis error:', redisError);
      return res.status(500).json({ 
        message: 'Layanan sementara tidak tersedia. Silakan coba lagi dalam beberapa saat.' 
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan. Silakan coba lagi.' 
    });
  }
} 