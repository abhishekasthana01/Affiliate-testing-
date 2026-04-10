import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS, storage } from '../lib/storage';
import { authService } from '../services/authService';
import { resetRealtimeSocket } from '../services/realtimeClient';

type User = {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'reseller';
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ message: string; otp?: string; email: string } | void>;
  verifySignup: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(storage.get<string>(STORAGE_KEYS.token));
  const devMockAuth = String(import.meta.env.VITE_DEV_MOCK_AUTH || '').toLowerCase() === 'true';

  useEffect(() => {
    if (!token) return;
    if (devMockAuth) {
      const seeded = storage.get<User>(STORAGE_KEYS.user);
      setUser(seeded || { id: 'dev-user', name: 'Dev User', email: 'dev@local.test' });
      return;
    }
    
    authService.getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, [token, devMockAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    async login(email: string, password: string) {
      if (devMockAuth) {
        const t = 'dev-local-token';
        storage.set(STORAGE_KEYS.token, t);
        setToken(t);
        const u = { id: 'dev-user', name: 'Dev User', email };
        storage.set(STORAGE_KEYS.user, u);
        setUser(u);
        return;
      }
      
      const data = await authService.login(email, password);
      const t = data.token;
      if (t) {
        storage.set(STORAGE_KEYS.token, t);
        setToken(t);
      }
      setUser(data.user ?? null);
    },
    async signup(name: string, email: string, password: string) {
      if (devMockAuth) {
        const t = 'dev-local-token';
        storage.set(STORAGE_KEYS.token, t);
        setToken(t);
        const u = { id: 'dev-user', name, email };
        storage.set(STORAGE_KEYS.user, u);
        setUser(u);
        return;
      }
      
      return await authService.signup(name, email, password);
    },
    async verifySignup(email: string, otp: string) {
      if (devMockAuth) {
        return;
      }
      const data = await authService.verifySignup(email, otp);
      const t = data.token;
      if (t) {
        storage.set(STORAGE_KEYS.token, t);
        setToken(t);
      }
      setUser(data.user ?? null);
    },
    logout() {
      storage.remove(STORAGE_KEYS.token);
      storage.remove(STORAGE_KEYS.user);
      setToken(null);
      setUser(null);
      resetRealtimeSocket();
    },
    updateUser(updates: Partial<User>) {
      setUser((prev) => {
        const next = { ...(prev || { id: 'dev-user', name: 'Dev User', email: 'dev@local.test' }), ...updates };
        storage.set(STORAGE_KEYS.user, next);
        return next;
      });
    },
  }), [user, token, devMockAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
