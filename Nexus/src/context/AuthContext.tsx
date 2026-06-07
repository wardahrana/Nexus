import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

type User = {
  id: string;
  name: string;
  email: string;
  role: 'entrepreneur' | 'investor';
  avatar?: string;      // ✅ add karo
  isOnline?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;                    // ✅ ADD
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
  setUserFromOTP: (user: User, token: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedToken = localStorage.getItem('token');
const savedUser = localStorage.getItem('user');
const [isLoading, setIsLoading] = useState(!savedToken);
const [token, setToken] = useState<string | null>(savedToken);
const [user, setUser] = useState<User | null>(
  savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null
);

 useEffect(() => {
  try {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser && savedUser !== 'undefined') {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } finally {
    setIsLoading(false);
  }
}, []);

  const login = async (
    email: string,
    password: string,
    role: User['role']
  ) => {
    try {
      const res = await API.post('/auth/login', { email, password, role });
      const { token, user } = res.data;

      setToken(token);
      setUser(user);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    try {
      const res = await API.post('/auth/signup', { name, email, password, role });
      console.log('Backend response:', res.data);
      const { user, token } = res.data;
      console.log('User:', user);                  // ✅ ADD
console.log('Token:', token);    

      setUser(user);
      setToken(token);

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      throw new Error(err.response?.data?.message || 'Signup failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
  };
  const setUserFromOTP = (userData: User, userToken: string) => {
  setUser(userData);
  setToken(userToken);
};

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        isAuthenticated: !!user,
        isLoading,                // ✅ ADD
        register,
        logout,
        setUserFromOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};