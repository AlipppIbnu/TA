// hooks/useAuth.js - Custom hook untuk proteksi route dengan Directus
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { directusAuth } from '../lib/directusConfig';

export const useAuth = (redirectTo = '/auth/login') => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cek apakah user sudah login
        if (directusAuth.isAuthenticated()) {
          // Verifikasi token dengan server
          const currentUser = await directusAuth.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setError(null);
          } else {
            throw new Error('Invalid user session');
          }
        } else {
          throw new Error('Not authenticated');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setError(err.message);
        setUser(null);
        
        // Redirect ke halaman login jika tidak authenticated
        if (redirectTo) {
          router.replace(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, redirectTo]);

  // Fungsi logout
  const logout = async () => {
    try {
      await directusAuth.logout();
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fungsi login
  const login = async (userId, email, password) => {
    try {
      setLoading(true);
      const result = await directusAuth.login(userId, email, password);
      setUser(result.user);
      setError(null);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

// Higher-order component untuk proteksi halaman
export const withAuth = (WrappedComponent, redirectTo = '/auth/login') => {
  return function AuthComponent(props) {
    const { user, loading, error } = useAuth(redirectTo);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Loading...</p>
          </div>
        </div>
      );
    }

    if (error || !user) {
      return null; // Component akan redirect di useAuth hook
    }

    return <WrappedComponent {...props} user={user} />;
  };
};