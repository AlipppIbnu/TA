// Authentication service with API proxy

// Daftar pengguna baru
export const register = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        username: userData.username,
        phoneNumber: userData.phoneNumber || null
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Gagal mendaftar' };
    }

    return { success: true, data: result.data };
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
      body: JSON.stringify({
        email,
        password
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    // Simpan data pengguna di localStorage
    const userData = result.data;
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