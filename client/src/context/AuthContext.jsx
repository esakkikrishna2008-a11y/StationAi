import { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // On mount, restore session from backend API
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('stationAI_token') || sessionStorage.getItem('stationAI_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setBackendError(null);
        const res = await api.getProfile();
        if (res && res.user) {
          setUser(res.user);
          setIsAuthenticated(true);
        } else {
          api.logout();
        }
      } catch (e) {
        console.error('Session restoration failed:', e);
        if (e.message?.includes('Unable to connect') || e.message?.includes('gateway error') || e.message?.includes('Backend unavailable')) {
          setBackendError(e.message);
        } else {
          api.logout();
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email, password, remember = false) => {
    try {
      setBackendError(null);
      const res = await api.login(email, password);
      if (res && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        if (remember) {
          localStorage.setItem('stationAI_token', res.token);
          sessionStorage.removeItem('stationAI_token');
        } else {
          sessionStorage.setItem('stationAI_token', res.token);
          localStorage.removeItem('stationAI_token');
        }
        return res.user;
      }
    } catch (err) {
      if (err.message?.includes('Unable to connect') || err.message?.includes('gateway error') || err.message?.includes('Backend unavailable')) {
        setBackendError(err.message);
      }
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setBackendError(null);
      const res = await api.register(userData);
      if (res && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        return res.user;
      }
    } catch (err) {
      if (err.message?.includes('Unable to connect') || err.message?.includes('gateway error') || err.message?.includes('Backend unavailable')) {
        setBackendError(err.message);
      }
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setBackendError(null);
    api.logout();
  };

  const updateUser = async (updates) => {
    try {
      const res = await api.updateProfile(updates);
      if (res && res.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      backendError,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
