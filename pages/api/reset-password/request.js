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

      // Rate limiting
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
      return res.status(500).json({ message: 'Gagal memeriksa email' });
    }

    const checkResult = await checkResponse.json();
    if (!checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ message: 'Email tidak ditemukan dalam sistem' });
    }

    // Generate OTP 6 digit
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP di Redis dengan expiry 5 menit (300 detik)
    await restRedis.setex(`reset_${email}`, 300, otp);

    // Kirim email OTP
    await sendOTPEmail(email, otp);

    return res.status(200).json({ 
      message: 'Kode OTP telah dikirim ke email Anda',
      success: true 
    });
    
  } catch {
    return res.status(500).json({ 
      message: 'Gagal mengirim email reset password'
    });
  }
} 