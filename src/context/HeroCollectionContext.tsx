// ─────────────────────────────────────────────────────────────
//  HeroCollectionContext.tsx
//  Manages the roster of owned heroes: level, exp, stars.
//  Persisted to AsyncStorage.
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
  expToNextLevel,
  MAX_LEVEL,
  MAX_STARS,
  type HeroState,
} from '../types/hero.types';
import { HERO_ROSTER } from '../data/heroRoster.data';

const STORAGE_KEY = '@realm_idle/hero_collection_v1';

interface HeroCollectionContextValue {
  heroes: HeroState[];
  isLoaded: boolean;
  /** Add EXP to a hero (from XP books). Returns remaining exp after level-ups. */
  addExp: (heroId: string, expAmount: number) => void;
  /** Star up a hero (caller must deduct gold first). */
  starUp: (heroId: string) => void;
}

const HeroCollectionContext = createContext<HeroCollectionContextValue | null>(null);

async function load(): Promise<HeroState[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HeroState[];
  } catch {
    return null;
  }
}

async function save(heroes: HeroState[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(heroes));
  } catch (e) {
    console.warn('[HeroCollectionContext] save failed', e);
  }
}

function initialHeroes(): HeroState[] {
  return HERO_ROSTER.map((t) => ({ id: t.id, level: 1, exp: 0, stars: 0 }));
}

export function HeroCollectionProvider({ children }: { children: React.ReactNode }) {
  const [heroes, setHeroes] = useState<HeroState[]>(initialHeroes);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    load().then((stored) => {
      if (stored && stored.length > 0) {
        // Merge: keep stored values, add any new heroes from roster at default state
        const storedMap = Object.fromEntries(stored.map((h) => [h.id, h]));
        const merged = HERO_ROSTER.map((t) => storedMap[t.id] ?? { id: t.id, level: 1, exp: 0, stars: 0 });
        setHeroes(merged);
      }
      setIsLoaded(true);
    });
  }, []);

  const addExp = useCallback((heroId: string, expAmount: number) => {
    setHeroes((prev) => {
      const next = prev.map((h) => {
        if (h.id !== heroId) return h;
        let { level, exp } = h;
        let remaining = expAmount;
        while (remaining > 0 && level < MAX_LEVEL) {
          const needed = expToNextLevel(level) - exp;
          if (remaining >= needed) {
            remaining -= needed;
            level += 1;
            exp = 0;
          } else {
            exp += remaining;
            remaining = 0;
          }
        }
        return { ...h, level, exp };
      });
      save(next);
      return next;
    });
  }, []);

  const starUp = useCallback((heroId: string) => {
    setHeroes((prev) => {
      const next = prev.map((h) => {
        if (h.id !== heroId || h.stars >= MAX_STARS) return h;
        return { ...h, stars: h.stars + 1 };
      });
      save(next);
      return next;
    });
  }, []);

  return (
    <HeroCollectionContext.Provider value={{ heroes, isLoaded, addExp, starUp }}>
      {children}
    </HeroCollectionContext.Provider>
  );
}

export function useHeroCollection() {
  const ctx = useContext(HeroCollectionContext);
  if (!ctx) throw new Error('useHeroCollection must be inside HeroCollectionProvider');
  return ctx;
}
