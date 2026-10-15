import { useState, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from './authContextInstance';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (isMounted) {
          if (response.data?.success && response.data?.data?.user) {
            setUser(response.data.data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem('token');
            setUser(null);
            setToken(null);
          }
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    const handleUnauthorized = () => {
      if (isMounted) {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success && response.data?.data && !response.data?.mfaRequired) {
      const { user: userData, token: tokenData } = response.data.data;
      localStorage.setItem('token', tokenData);
      setToken(tokenData);
      setUser(userData);
    }
    return response.data;
  };

  const verify2FA = async (tempToken, code) => {
    const response = await api.post('/auth/verify-2fa', { tempToken, code });
    if (response.data?.success && response.data?.data) {
      const { user: userData, token: tokenData } = response.data.data;
      localStorage.setItem('token', tokenData);
      setToken(tokenData);
      setUser(userData);
    }
    return response.data;
  };

  const resend2FA = async (tempToken) => {
    const response = await api.post('/auth/resend-2fa', { tempToken });
    return response.data;
  };

  const toggle2FA = async (enabled) => {
    const response = await api.put('/auth/2fa/toggle', { enabled });
    if (response.data?.success && response.data?.data) {
      setUser((prev) =>
        prev ? { ...prev, twoFactorEnabled: response.data.data.twoFactorEnabled } : prev
      );
    }
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password
    });
    if (response.data?.success && response.data?.data) {
      const { user: userData, token: tokenData } = response.data.data;
      localStorage.setItem('token', tokenData);
      setToken(tokenData);
      setUser(userData);
    }
    return response.data;
  };

  const loginWithGoogle = async (googleData) => {
    const response = await api.post('/auth/google', {
      email: googleData.email,
      name: googleData.displayName,
      uid: googleData.uid
    });
    if (response.data?.success && response.data?.data) {
      const { user: userData, token: tokenData } = response.data.data;
      localStorage.setItem('token', tokenData);
      setToken(tokenData);
      setUser(userData);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'admin',
    login,
    verify2FA,
    resend2FA,
    toggle2FA,
    loginWithGoogle,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
