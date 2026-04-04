// ─────────────────────────────────────────────────────────────
//  TalentContext.tsx
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TalentBonuses, TalentState } from '../types/talent.types';
import {
  awardTalentPoints,
  calcTalentBonuses,
  calcTalentCp,
  getHeroTalents,
  initialTalentState,
  unlockNode,
} from '../engine/talentEngine';

const STORAGE_KEY = '@realm_idle/talent_state_v1';

interface TalentContextValue {
  talentState: TalentState;
  isLoaded: boolean;
  unlock: (heroId: string, nodeId: string) => void;
  awardPoints: (heroId: string, points: number) => void;
  getBonuses: (heroId: string) => TalentBonuses;
  getTalentCp: (heroId: string) => number;
  getPoints: (heroId: string) => number;
}

const TalentContext = createContext<TalentContextValue | null>(null);

async function load(): Promise<TalentState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialTalentState();
    return JSON.parse(raw) as TalentState;
  } catch {
    return initialTalentState();
  }
}

async function save(s: TalentState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('[TalentContext] save failed', e);
  }
}

export function TalentProvider({ children }: { children: React.ReactNode }) {
  const [talentState, setTalentState] =
    useState<TalentState>(initialTalentState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    load().then((s) => {
      setTalentState(s);
      setIsLoaded(true);
    });
  }, []);

  function update(next: TalentState) {
    setTalentState(next);
    save(next);
  }

  const unlock = useCallback((heroId: string, nodeId: string) => {
    setTalentState((prev) => {
      try {
        const next = unlockNode(prev, heroId, nodeId);
        save(next);
        return next;
      } catch (e) {
        console.warn('[TalentContext] unlock failed:', e);
        return prev;
      }
    });
  }, []);

  const awardPoints = useCallback((heroId: string, points: number) => {
    setTalentState((prev) => {
      const next = awardTalentPoints(prev, heroId, points);
      save(next);
      return next;
    });
  }, []);

  const getBonuses = useCallback(
    (heroId: string): TalentBonuses => {
      return calcTalentBonuses(talentState, heroId);
    },
    [talentState],
  );

  const getTalentCp = useCallback(
    (heroId: string): number => {
      return calcTalentCp(calcTalentBonuses(talentState, heroId));
    },
    [talentState],
  );

  const getPoints = useCallback(
    (heroId: string): number => {
      return getHeroTalents(talentState, heroId).talentPoints;
    },
    [talentState],
  );

  return (
    <TalentContext.Provider
      value={{
        talentState,
        isLoaded,
        unlock,
        awardPoints,
        getBonuses,
        getTalentCp,
        getPoints,
      }}
    >
      {children}
    </TalentContext.Provider>
  );
}

export function useTalent() {
  const ctx = useContext(TalentContext);
  if (!ctx) throw new Error('useTalent must be inside TalentProvider');
  return ctx;
}
