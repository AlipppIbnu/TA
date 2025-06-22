import bcrypt from 'bcryptjs';
import directusConfig from '../../../lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Search for user by email
    const searchResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Login failed');
    }

    const searchResult = await searchResponse.json();
    
    if (!searchResult.data || searchResult.data.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = searchResult.data[0];

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user data without sensitive information
    const userData = {
      userId: user.users_id,
      email: user.email,
      fullName: user.name,
      username: user.nickname,
      phoneNumber: user.phone_number
    };
    
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
}
