// ─────────────────────────────────────────────────────────────
//  PlayerContext.tsx
//  Shared player currencies accessible from any screen.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initialCurrencies,
  type PlayerCurrencies,
} from '../types/player.types';
import { useAuth } from './AuthContext';
import { addCurrencyToBackend } from '../services/playerService';

const STORAGE_KEY = '@realm_idle/player_currencies_v1';

interface PlayerContextValue {
  currencies: PlayerCurrencies;
  isLoaded: boolean;
  addCurrencies: (delta: Partial<PlayerCurrencies>) => void;
  spendCurrencies: (cost: Partial<PlayerCurrencies>) => boolean; // returns false if insufficient
  setCurrencies: (next: PlayerCurrencies) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

async function load(): Promise<PlayerCurrencies> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialCurrencies();
    return { ...initialCurrencies(), ...JSON.parse(raw) };
  } catch {
    return initialCurrencies();
  }
}

async function save(c: PlayerCurrencies) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch (e) {
    console.warn('[PlayerContext] save failed', e);
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { token, player: authPlayer } = useAuth();
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const [currencies, setCurrenciesState] =
    useState<PlayerCurrencies>(initialCurrencies);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load local currencies from AsyncStorage on mount
  useEffect(() => {
    load().then((c) => {
      setCurrenciesState(c);
      setIsLoaded(true);
    });
  }, []);

  // When auth player loads (on login), override gold/diamonds/summonScrolls with backend values
  useEffect(() => {
    if (!authPlayer) return;
    setCurrenciesState((prev) => ({
      ...prev,
      gold: authPlayer.gold,
      diamonds: authPlayer.diamonds,
      summonScrolls: authPlayer.summonScrolls,
    }));
  }, [authPlayer?.gold, authPlayer?.diamonds, authPlayer?.summonScrolls]);

  function update(next: PlayerCurrencies) {
    setCurrenciesState(next);
    save(next);
  }

  const addCurrencies = useCallback((delta: Partial<PlayerCurrencies>) => {
    setCurrenciesState((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(delta) as (keyof PlayerCurrencies)[]) {
        next[k] = Math.max(0, (prev[k] ?? 0) + (delta[k] ?? 0));
      }
      save(next);

      // Sync backend-tracked currencies (fire and forget)
      if (tokenRef.current) {
        const backendDelta: { gold?: number; diamonds?: number; summonScrolls?: number } = {};
        if (delta.gold) backendDelta.gold = delta.gold;
        if (delta.diamonds) backendDelta.diamonds = delta.diamonds;
        if (delta.summonScrolls) backendDelta.summonScrolls = delta.summonScrolls;
        if (Object.keys(backendDelta).length > 0) {
          addCurrencyToBackend(tokenRef.current, backendDelta).catch((e) =>
            console.warn('[PlayerContext] backend sync failed', e)
          );
        }
      }

      return next;
    });
  }, []);

  const spendCurrencies = useCallback(
    (cost: Partial<PlayerCurrencies>): boolean => {
      let canAfford = true;
      setCurrenciesState((prev) => {
        for (const k of Object.keys(cost) as (keyof PlayerCurrencies)[]) {
          if ((prev[k] ?? 0) < (cost[k] ?? 0)) {
            canAfford = false;
            return prev;
          }
        }
        const next = { ...prev };
        for (const k of Object.keys(cost) as (keyof PlayerCurrencies)[]) {
          next[k] = Math.max(0, (prev[k] ?? 0) - (cost[k] ?? 0));
        }
        save(next);
        return next;
      });
      return canAfford;
    },
    [],
  );

  const setCurrencies = useCallback(
    (next: PlayerCurrencies) => update(next),
    [],
  );

  return (
    <PlayerContext.Provider
      value={{
        currencies,
        isLoaded,
        addCurrencies,
        spendCurrencies,
        setCurrencies,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
