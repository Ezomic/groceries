import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { registerUnauthorizedHandler } from './api';

interface AuthContextValue {
  token: string | null;
  user: { id: number; name: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextValue['user']>(null);

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'user']).then(([t, u]) => {
      if (t[1]) setToken(t[1]);
      if (u[1]) setUser(JSON.parse(u[1]));
    });
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/login', { email, password });
    await AsyncStorage.multiSet([['token', data.token], ['user', JSON.stringify(data.user)]]);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string, password_confirmation: string) {
    const { data } = await api.post('/register', { name, email, password, password_confirmation });
    await AsyncStorage.multiSet([['token', data.token], ['user', JSON.stringify(data.user)]]);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await api.post('/logout').catch(() => {});
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
