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
        method: 'GET',
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
      headers: directusConfig.headers,
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

// Login pengguna dengan device recognition
export const login = async (email, password, deviceId = null) => {
  try {
    // Call internal API endpoint yang akan handle device checking
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password,
        deviceId 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Jika tidak perlu OTP (device recognized), simpan user data
    if (!data.requireOtp) {
      // Simpan data pengguna di localStorage
      const userData = {
        userId: data.user.users_id,
        email: data.user.email,
        fullName: data.user.name,
        username: data.user.nickname,
        phoneNumber: data.user.phone_number
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Login langsung tanpa device check (untuk internal use di API)
export const directLogin = async (email, password) => {
  try {
    // Pertama, cari pengguna berdasarkan email
    const searchResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: directusConfig.headers,
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Login failed');
    }

    const searchResult = await searchResponse.json();
    
    if (!searchResult.data || searchResult.data.length === 0) {
      throw new Error('User not found');
    }

    const user = searchResult.data[0];

    // Verifikasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return user;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// Logout pengguna
export const logout = async () => {
  return new Promise((resolve) => {
    localStorage.removeItem('user');
    // Note: We don't remove device_id cookie on logout
    // So the device remains recognized for next login
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