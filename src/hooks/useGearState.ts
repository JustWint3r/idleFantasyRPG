// ─────────────────────────────────────────────────────────────
//  useGearState.ts
//  Persists gear state to AsyncStorage and exposes it globally.
//  Import this hook in any screen that needs gear data.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  GearItem,
  GearState,
  Pet,
  UpgradeResult,
} from '../types/gear.types';
import {
  applyUpgradeResult,
  attemptUpgrade,
  calcLoadoutCp,
  calcLoadoutStats,
  createItem,
  createPet,
  equipItem,
  initialGearState,
  unequipItem,
  upgradeMythical,
  assignPetSlot,
} from '../engine/gearEngine';

const STORAGE_KEY = '@realm_idle/gear_state_v1';

// ── Seed demo data (only applied on first launch) ─────────────

function seedDemoData(s: GearState): GearState {
  if (s.items.length > 0) return s; // already has data

  const sword = createItem('wpn_iron_sword', 'rare');
  const armor = createItem('arm_leather_vest', 'common');
  const helmet = createItem('helm_iron_cap', 'common');
  const ring = createItem('rng_ember_signet', 'epic');
  const slime = createPet('pet_slime', 'common');
  const fox = createPet('pet_fox', 'rare');

  let next = { ...s, items: [sword, armor, helmet, ring], pets: [slime, fox] };
  next = equipItem(next, sword.id, 'hero_001');
  next = equipItem(next, armor.id, 'hero_001');
  next = equipItem(next, helmet.id, 'hero_001');
  next = equipItem(next, ring.id, 'hero_001');
  next.pets[0] = { ...slime, dungeonSlot: 0 };
  next.pets[1] = { ...fox, dungeonSlot: 1 };
  return next;
}

// ── Storage helpers ───────────────────────────────────────────

async function loadGearState(): Promise<GearState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemoData(initialGearState());
    return JSON.parse(raw) as GearState;
  } catch {
    return seedDemoData(initialGearState());
  }
}

async function saveGearState(state: GearState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[GearState] Failed to save:', e);
  }
}

// ── Hook return type ──────────────────────────────────────────

export interface UseGearStateReturn {
  gearState: GearState;
  isLoaded: boolean;
  /** Total gear CP for a given hero */
  getHeroCp: (heroId: string, baseHeroCp: number) => number;
  /** Total gear stats for a given hero */
  getHeroStats: (heroId: string) => ReturnType<typeof calcLoadoutStats>;
  /** Equip an item to a hero */
  equip: (itemId: string, heroId: string) => void;
  /** Unequip an item from a hero */
  unequip: (itemId: string, heroId: string) => void;
  /** Attempt to upgrade an item */
  upgrade: (item: GearItem, supportStoneBonus?: number) => UpgradeResult;
  /** Apply the result of an upgrade attempt */
  applyUpgrade: (result: UpgradeResult, stoneId?: string) => void;
  /** Assign a pet to dungeon slot */
  assignPet: (petId: string, slot: 0 | 1 | 2 | null) => void;
  /** Fuse two legendaries into mythical */
  fuseMyth: (baseId: string, sacrificeId: string) => void;
  /** Add items to the gear state */
  addItems: (items: GearItem[]) => void;
}

// ── Hook ──────────────────────────────────────────────────────

export function useGearState(): UseGearStateReturn {
  const [gearState, setGearState] = useState<GearState>(initialGearState);
  const [isLoaded, setIsLoaded] = useState(false);
  const addItems = useCallback(
    (newItems: GearItem[]) => {
      update({ ...gearState, items: [...gearState.items, ...newItems] });
    },
    [gearState],
  );

  useEffect(() => {
    loadGearState().then((s) => {
      setGearState(s);
      setIsLoaded(true);
    });
  }, []);

  function update(next: GearState) {
    setGearState(next);
    saveGearState(next);
  }

  const getHeroCp = useCallback(
    (heroId: string, baseHeroCp: number) => {
      return baseHeroCp + calcLoadoutCp(gearState, heroId);
    },
    [gearState],
  );

  const getHeroStats = useCallback(
    (heroId: string) => {
      return calcLoadoutStats(gearState, heroId);
    },
    [gearState],
  );

  const equip = useCallback(
    (itemId: string, heroId: string) => {
      update(equipItem(gearState, itemId, heroId));
    },
    [gearState],
  );

  const unequip = useCallback(
    (itemId: string, heroId: string) => {
      update(unequipItem(gearState, itemId, heroId));
    },
    [gearState],
  );

  const upgrade = useCallback(
    (item: GearItem, supportStoneBonus = 0): UpgradeResult => {
      return attemptUpgrade(item, { supportStoneBonus });
    },
    [],
  );

  const applyUpgrade = useCallback(
    (result: UpgradeResult, stoneId?: string) => {
      update(applyUpgradeResult(gearState, result, stoneId));
    },
    [gearState],
  );

  const assignPet = useCallback(
    (petId: string, slot: 0 | 1 | 2 | null) => {
      update(assignPetSlot(gearState, petId, slot));
    },
    [gearState],
  );

  const fuseMyth = useCallback(
    (baseId: string, sacrificeId: string) => {
      update(upgradeMythical(gearState, baseId, sacrificeId));
    },
    [gearState],
  );

  return {
    gearState,
    isLoaded,
    getHeroCp,
    getHeroStats,
    equip,
    unequip,
    upgrade,
    applyUpgrade,
    assignPet,
    fuseMyth,
    addItems,
  };
}
