import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

// Demo users - clearly labelled as prototype-only credentials
const DEMO_USERS = [
  {
    id: 1,
    email: 'admin@stationai.shop',
    password: 'admin123',
    name: 'Shopkeeper Admin',
    shopName: 'StationAI Demo Store',
    phone: '+91 98765 43210',
    role: 'Store Administrator',
    createdAt: '2026-01-15T09:00:00.000Z',
  }
];

const SESSION_KEY = 'stationAI_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session && session.user) {
          setUser(session.user);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Demo login — validates against hardcoded credentials only.
   * NOT a real authentication system. No token, no server.
   */
  const login = async (email, password, remember = false) => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    // Check demo users
    const match = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    // Also check any registered users in localStorage
    const registered = JSON.parse(localStorage.getItem('stationAI_users') || '[]');
    const registeredMatch = registered.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    const found = match || registeredMatch;

    if (!found) {
      throw new Error('Invalid email or password. Use the demo credentials shown below.');
    }

    const sessionUser = {
      id: found.id,
      email: found.email,
      name: found.name,
      shopName: found.shopName,
      phone: found.phone,
      role: found.role || 'Store Manager',
      createdAt: found.createdAt,
    };

    setUser(sessionUser);
    setIsAuthenticated(true);

    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: sessionUser }));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: sessionUser }));
      // Still set in localStorage so page refresh works — clear on logout
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: sessionUser }));
    }

    return sessionUser;
  };

  /**
   * Demo registration — saves to localStorage only.
   * No real backend, no email verification.
   */
  const register = async (userData) => {
    await new Promise(r => setTimeout(r, 600));

    const existing = [
      ...DEMO_USERS,
      ...JSON.parse(localStorage.getItem('stationAI_users') || '[]')
    ];

    if (existing.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: Date.now(),
      email: userData.email,
      password: userData.password,
      name: userData.name,
      shopName: userData.shopName,
      phone: userData.phone,
      role: 'Store Manager',
      createdAt: new Date().toISOString(),
    };

    const users = JSON.parse(localStorage.getItem('stationAI_users') || '[]');
    users.push(newUser);
    localStorage.setItem('stationAI_users', JSON.stringify(users));

    return newUser;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: updated }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
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
