import { useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import { api } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then((data: unknown) => setUser(data as User))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const data = (await api.login(email, password)) as AuthResponse;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName?: string) => {
    await api.signup(email, password, fullName);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, login, signup, logout, isAdmin: user?.role === 'admin' };
}
