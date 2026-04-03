// ─────────────────────────────────────────────────────────────
//  PlayerContext.tsx
//  Shared player currencies accessible from any screen.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initialCurrencies,
  type PlayerCurrencies,
} from '../types/player.types';

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
  const [currencies, setCurrenciesState] =
    useState<PlayerCurrencies>(initialCurrencies);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    load().then((c) => {
      setCurrenciesState(c);
      setIsLoaded(true);
    });
  }, []);

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
