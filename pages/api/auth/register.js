import directusConfig from '../../../lib/directusConfig';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, fullName, username, phoneNumber } = req.body;

    if (!email || !password || !fullName || !username) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    // Periksa apakah email sudah ada
    const checkResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!checkResponse.ok) {
      return res.status(500).json({ error: 'Failed to check email' });
    }

    const checkResult = await checkResponse.json();
    if (checkResult.data && checkResult.data.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Buat pengguna baru
    const response = await fetch(directusConfig.endpoints.users, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
      },
      body: JSON.stringify({
        users_id: randomUUID(),
        email: email,
        password_hash: hashedPassword,
        name: fullName,
        nickname: username,
        phone_number: phoneNumber || null
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Gagal mendaftar' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 