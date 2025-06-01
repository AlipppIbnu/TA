import directusConfig from './directusConfig';

// Generate a unique user ID
const generateUserId = () => {
  return Date.now().toString();
};

// Register new user
export const register = async (userData) => {
  try {
    // First check if email already exists
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

    // Create new user
    const response = await fetch(directusConfig.endpoints.users, {
      method: 'POST',
      headers: {
        ...directusConfig.headers,
      },
      body: JSON.stringify({
        user_id: Date.now().toString(), // Generate a unique user_id
        email: userData.email,
        password_hash: userData.password,
        full_name: userData.fullName,
        username: userData.username,
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

// Login user
export const login = async (email, password) => {
  try {
    // First, find the user by email
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
      throw new Error('User not found');
    }

    const user = searchResult.data[0];

    // In a real application, you would verify the password hash here
    // For now, we'll do a simple comparison (NOT SECURE - just for demo)
    if (user.password_hash !== password) {
      throw new Error('Invalid credentials');
    }

    // Store user data in localStorage
    const userData = {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      username: user.username,
      phoneNumber: user.phone_number
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// Logout user
export const logout = async () => {
  return new Promise((resolve) => {
    localStorage.removeItem('user');
    resolve();
  });
};

// Get current user
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
}; 