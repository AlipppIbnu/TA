import directusConfig from './directusConfig';
import bcrypt from 'bcryptjs';

// Generate ID pengguna unik (format UUID)
const generateUserId = () => {
  return crypto.randomUUID();
};

// Daftar pengguna baru
export const register = async (userData) => {
  try {
    // Pertama periksa apakah email sudah ada
    const checkResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(userData.email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    if (!checkResponse.ok) {
      return { success: false, error: 'Failed to check email' };
    }

    const checkResult = await checkResponse.json();
    if (checkResult.data && checkResult.data.length > 0) {
      return { success: false, error: 'Email sudah terdaftar' };
    }

    // Hash password sebelum disimpan
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Buat pengguna baru
    const response = await fetch(directusConfig.endpoints.users, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
      },
      body: JSON.stringify({
        users_id: generateUserId(), // Generate UUID
        email: userData.email,
        password_hash: hashedPassword, // Simpan password yang di-hash
        name: userData.fullName,
        nickname: userData.username,
        phone_number: userData.phoneNumber || null
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.errors?.[0]?.message || 'Gagal mendaftar' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || 'Gagal mendaftar' };
  }
};

// Login pengguna
export const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const userData = await response.json();
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// Logout pengguna
export const logout = async () => {
  return new Promise((resolve) => {
    localStorage.removeItem('user');
    resolve();
  });
};

// Dapatkan pengguna saat ini
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Periksa apakah pengguna sudah terotentikasi
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
}; 