import directusConfig from '../../lib/directusConfig';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'login':
      return handleLogin(req, res);
    case 'register':
      return handleRegister(req, res);
    case 'forgot-password':
      return handleForgotPassword(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action. Use: login, register, forgot-password' });
  }
}

// LOGIN HANDLER
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Cari pengguna berdasarkan email melalui server-side call
    const searchResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!searchResponse.ok) {
      return res.status(401).json({ error: 'Login failed' });
    }

    const searchResult = await searchResponse.json();
    
    if (!searchResult.data || searchResult.data.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = searchResult.data[0];

    // Verifikasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user data
    const userData = {
      userId: user.users_id,
      email: user.email,
      fullName: user.name,
      username: user.nickname,
      phoneNumber: user.phone_number
    };
    
    return res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// REGISTER HANDLER
async function handleRegister(req, res) {
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

// FORGOT PASSWORD HANDLER
async function handleForgotPassword(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Cek apakah email terdaftar
    const checkResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    const checkResult = await checkResponse.json();
    
    if (!checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ error: 'Email tidak terdaftar' });
    }

    // Kirim request reset password ke endpoint Directus
    const response = await fetch(`${directusConfig.baseURL}/auth/password/request`, {
      method: 'POST',
      headers: directusConfig.headers,
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Gagal mengirim email reset password' });
    }

    return res.status(200).json({ success: true, message: 'Link reset password telah dikirim ke email Anda.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 