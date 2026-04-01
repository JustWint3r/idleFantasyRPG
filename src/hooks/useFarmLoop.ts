// ─────────────────────────────────────────────────────────────
//  useFarmLoop.ts
//  React Native hook — wires farmEngine to AsyncStorage and the
//  app lifecycle (foreground / background transitions).
//
//  Usage:
//    const { farmState, offlineSummary, deployHero, claimOffline } = useFarmLoop();
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DeployedHero,
  FarmState,
  FarmZone,
  Item,
  OfflineSummary,
  Resources,
} from '../types/farm.types';

import {
  calculateOfflineFarm,
  claimPending,
  deployHero as engineDeploy,
  emptyResources,
  tickFarm,
  undeployHero as engineUndeploy,
  addResources,
} from '../engine/farmEngine';

// ── Constants ─────────────────────────────────────────────────

const STORAGE_KEY = '@realm_idle/farm_state_v1';

/** How often the live tick runs while the app is in the foreground (ms). */
const LIVE_TICK_MS = 5_000;

// ── Initial state ─────────────────────────────────────────────

function initialState(): FarmState {
  return {
    deployedHero: null,
    lastSavedAt: Date.now(),
    pendingResources: emptyResources(),
    pendingItems: [],
    totalSecondsFarmed: 0,
  };
}

// ── Storage helpers ───────────────────────────────────────────

async function loadState(): Promise<FarmState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    return JSON.parse(raw) as FarmState;
  } catch {
    return initialState();
  }
}

async function saveState(state: FarmState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        lastSavedAt: Date.now(), // always stamp on save
      }),
    );
  } catch (e) {
    console.warn('[FarmLoop] Failed to save state', e);
  }
}

// ── Hook return type ──────────────────────────────────────────

export interface UseFarmLoopReturn {
  /** Current farm state (hero, pending loot, etc.) */
  farmState: FarmState;
  /** Set when the app reopens after being backgrounded */
  offlineSummary: OfflineSummary | null;
  /** Whether the initial load from storage is complete */
  isLoaded: boolean;
  /** Resources accumulated this session (live ticks only) */
  sessionResources: Resources;
  /** Items dropped this session (live ticks only) */
  sessionItems: Item[];
  /** Deploy a hero to a zone */
  deployHero: (hero: DeployedHero, zone: FarmZone) => void;
  /** Remove hero from the zone (saves any pending loot) */
  undeployHero: () => void;
  /** Dismiss the offline summary and add loot to inventory */
  claimOfflineLoot: () => Resources & { items: Item[] };
}

// ── Hook ──────────────────────────────────────────────────────

export function useFarmLoop(): UseFarmLoopReturn {
  const [farmState, setFarmState] = useState<FarmState>(initialState());
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(
    null,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionResources, setSessionResources] =
    useState<Resources>(emptyResources());
  const [sessionItems, setSessionItems] = useState<Item[]>([]);

  // Keep a ref so closures inside intervals always see the latest state
  // without recreating the interval on every render.
  const stateRef = useRef<FarmState>(farmState);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync stateRef whenever state changes
  useEffect(() => {
    stateRef.current = farmState;
  }, [farmState]);

  // ── Bootstrap: load from storage and handle offline calc ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loaded = await loadState();
      if (cancelled) return;

      // Check for offline rewards before updating state
      const summary = calculateOfflineFarm(loaded, Date.now());

      if (summary) {
        // Merge offline loot into pendingResources / pendingItems
        const merged: FarmState = {
          ...loaded,
          lastSavedAt: Date.now(),
          pendingResources: addResources(
            loaded.pendingResources,
            summary.result.resources,
          ),
          pendingItems: [...loaded.pendingItems, ...summary.result.items],
          totalSecondsFarmed:
            loaded.totalSecondsFarmed + summary.durationSeconds,
        };

        setFarmState(merged);
        setOfflineSummary(summary);
        await saveState(merged);
      } else {
        const refreshed = { ...loaded, lastSavedAt: Date.now() };
        setFarmState(refreshed);
        await saveState(refreshed);
      }

      setIsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Live tick interval ────────────────────────────────────
  const startTick = useCallback(() => {
    if (tickRef.current) return; // already running

    tickRef.current = setInterval(() => {
      const current = stateRef.current;
      const result = tickFarm(current, Date.now());
      if (!result) return;

      const next: FarmState = {
        ...current,
        lastSavedAt: Date.now(),
        pendingResources: addResources(
          current.pendingResources,
          result.resources,
        ),
        pendingItems: [...current.pendingItems, ...result.items],
        totalSecondsFarmed: current.totalSecondsFarmed + result.durationSeconds,
      };

      setFarmState(next);
      setSessionResources((prev) => addResources(prev, result.resources));
      setSessionItems((prev) => [...prev, ...result.items]);
      saveState(next);
    }, LIVE_TICK_MS);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Start ticking when loaded
  useEffect(() => {
    if (!isLoaded) return;
    startTick();
    return stopTick;
  }, [isLoaded, startTick, stopTick]);

  // ── AppState listener: save on background, recalc on foreground ──
  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      async (nextStatus: AppStateStatus) => {
        if (nextStatus === 'background' || nextStatus === 'inactive') {
          // App going to background — save immediately
          stopTick();
          await saveState({ ...stateRef.current, lastSavedAt: Date.now() });
          return;
        }

        if (nextStatus === 'active') {
          // App returned to foreground — check for offline rewards
          const saved = await loadState();
          const summary = calculateOfflineFarm(saved, Date.now());

          if (summary) {
            const merged: FarmState = {
              ...saved,
              lastSavedAt: Date.now(),
              pendingResources: addResources(
                saved.pendingResources,
                summary.result.resources,
              ),
              pendingItems: [...saved.pendingItems, ...summary.result.items],
              totalSecondsFarmed:
                saved.totalSecondsFarmed + summary.durationSeconds,
            };
            setFarmState(merged);
            setOfflineSummary(summary);
            await saveState(merged);
          } else {
            const refreshed = { ...saved, lastSavedAt: Date.now() };
            setFarmState(refreshed);
          }

          startTick();
        }
      },
    );

    return () => sub.remove();
  }, [startTick, stopTick]);

  // ── Public actions ────────────────────────────────────────

  const deployHero = useCallback((hero: DeployedHero, zone: FarmZone) => {
    try {
      const next = engineDeploy(stateRef.current, hero, zone, Date.now());
      setFarmState(next);
      saveState(next);
    } catch (e) {
      console.warn('[FarmLoop] deployHero failed:', e);
      throw e; // rethrow so UI can show error
    }
  }, []);

  const undeployHero = useCallback(() => {
    const { newState, pendingResult } = engineUndeploy(
      stateRef.current,
      Date.now(),
    );
    setFarmState(newState);
    saveState(newState);

    if (pendingResult) {
      setSessionResources((prev) =>
        addResources(prev, pendingResult.resources),
      );
      setSessionItems((prev) => [...prev, ...pendingResult.items]);
    }
  }, []);

  const claimOfflineLoot = useCallback((): Resources & { items: Item[] } => {
    const { claimed, newState } = claimPending(stateRef.current);
    setFarmState(newState);
    setOfflineSummary(null);
    saveState(newState);
    return { ...claimed.resources, items: claimed.items };
  }, []);

  return {
    farmState,
    offlineSummary,
    isLoaded,
    sessionResources,
    sessionItems,
    deployHero,
    undeployHero,
    claimOfflineLoot,
  };
}
