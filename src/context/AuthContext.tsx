import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AuthPlayer } from '../services/authService';

const TOKEN_KEY = '@realm_idle/auth_token';
const PLAYER_KEY = '@realm_idle/auth_player';

interface AuthContextValue {
  token: string | null;
  player: AuthPlayer | null;
  isLoaded: boolean;
  setAuth: (token: string, player: AuthPlayer) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<AuthPlayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [t, p] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(PLAYER_KEY),
        ]);
        if (t) setToken(t);
        if (p) setPlayer(JSON.parse(p));
      } catch {}
      setIsLoaded(true);
    }
    load();
  }, []);

  function setAuth(t: string, p: AuthPlayer) {
    setToken(t);
    setPlayer(p);
    AsyncStorage.setItem(TOKEN_KEY, t);
    AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(p));
  }

  async function logout() {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(PLAYER_KEY),
    ]);
    setToken(null);
    setPlayer(null);
  }

  return (
    <AuthContext.Provider value={{ token, player, isLoaded, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
