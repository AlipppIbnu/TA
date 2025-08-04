import redisClient from '../../../lib/redis.js';
import { checkRateLimit } from '../../../lib/rate-limit.js';
import directusConfig from '../../../lib/directusConfig.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  console.log('🔍 Reset Password Update Request:', {
    method: req.method,
    body: {
      email: req.body.email,
      hasNewPassword: !!req.body.newPassword,
      passwordLength: req.body.newPassword?.length,
      hasResetToken: !!req.body.resetToken,
      resetTokenLength: req.body.resetToken?.length
    }
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, newPassword, resetToken } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Rate limiting
  if (!checkRateLimit(`update_${clientIP}`, 3, 300000)) {
    return res.status(429).json({ 
      message: 'Terlalu banyak percobaan update password. Coba lagi dalam 5 menit.' 
    });
  }

  if (!email || !newPassword || !resetToken) {
    return res.status(400).json({ message: 'Semua field diperlukan' });
  }

  // Validasi kekuatan password
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password minimal 6 karakter' });
  }

  try {
    // Verify reset token
    const tokenKey = `reset_token_${email}`;
    console.log('📦 Checking reset token with key:', tokenKey);
    
    const storedToken = await redisClient.get(tokenKey);
    console.log('🔐 Token comparison:', {
      hasStoredToken: !!storedToken,
      storedTokenLength: storedToken?.length,
      receivedTokenLength: resetToken?.length,
      tokenMatch: storedToken === resetToken
    });
    
    if (!storedToken || storedToken !== resetToken) {
      console.log('❌ Token invalid or expired');
      return res.status(400).json({ 
        message: 'Token reset tidak valid atau telah kedaluwarsa' 
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Cari user berdasarkan email
    const searchResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!searchResponse.ok) {
      return res.status(500).json({ message: 'Gagal mencari user' });
    }

    const searchResult = await searchResponse.json();
    if (!searchResult.data || searchResult.data.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = searchResult.data[0];

    // Update password di database Directus
    const updateResponse = await fetch(`${directusConfig.endpoints.users}/${user.users_id}`, {
      method: 'PATCH',
      headers: {
        ...directusConfig.headers,
      },
      body: JSON.stringify({
        password_hash: hashedPassword
      }),
    });

    if (!updateResponse.ok) {
      return res.status(500).json({ message: 'Gagal memperbarui password' });
    }

    // Hapus reset token
    await redisClient.del(`reset_token_${email}`);

    return res.status(200).json({ 
      message: 'Password berhasil diperbarui',
      success: true 
    });
    
  } catch {
    return res.status(500).json({ 
      message: 'Terjadi kesalahan saat memperbarui password' 
    });
  }
}