// ─────────────────────────────────────────────────────────────
//  gearEngine.ts
//  Pure functions for gear: stat calc, upgrade logic, CP.
//  Zero React, zero AsyncStorage — fully unit-testable.
// ─────────────────────────────────────────────────────────────

import * as Crypto from 'expo-crypto';
const uuid = () => Crypto.randomUUID();

import {
  addStats,
  emptyStats,
  RARITY_STAT_MULT,
  type GearItem,
  type GearState,
  type HeroLoadout,
  type Pet,
  type Rarity,
  type StatBlock,
  type UpgradeResult,
} from '../types/gear.types';
import { getTemplate } from '../data/gearTemplates.data';

// ── Success rate table (Type B — probability items) ───────────
// Index = item level (1-based). Level 1-4 → 100%.
const SUCCESS_RATE: Record<number, number> = {
  1: 100,
  2: 100,
  3: 100,
  4: 100,
  5: 80,
  6: 65,
  7: 50,
  8: 35,
  9: 20,
  10: 10,
};

export function getBaseSuccessRate(level: number): number {
  return SUCCESS_RATE[level] ?? 10;
}

// ── Stat calculation ──────────────────────────────────────────

/**
 * Calculate final stats for an item at its current level and rarity.
 * Formula: (baseStats + statPerLevel × (level-1)) × rarityMult
 */
export function calcItemStats(
  templateId: string,
  level: number,
  rarity: Rarity,
): StatBlock {
  const t = getTemplate(templateId);
  const mult = RARITY_STAT_MULT[rarity];
  const levelBonus = level - 1;

  return {
    atk: Math.round((t.baseStats.atk + t.statPerLevel.atk * levelBonus) * mult),
    def: Math.round((t.baseStats.def + t.statPerLevel.def * levelBonus) * mult),
    hp: Math.round((t.baseStats.hp + t.statPerLevel.hp * levelBonus) * mult),
    crit:
      Math.round(
        (t.baseStats.crit + t.statPerLevel.crit * levelBonus) * mult * 10,
      ) / 10,
    critDmg:
      Math.round(
        (t.baseStats.critDmg + t.statPerLevel.critDmg * levelBonus) * mult * 10,
      ) / 10,
  };
}

/**
 * Calculate CP contribution from an item.
 */
export function calcItemCp(
  templateId: string,
  level: number,
  rarity: Rarity,
): number {
  const t = getTemplate(templateId);
  const mult = RARITY_STAT_MULT[rarity];
  return Math.round((t.baseCp + t.cpPerLevel * (level - 1)) * mult);
}

// ── Item creation ─────────────────────────────────────────────

/** Instantiate a new GearItem from a template. Starts at level 1. */
export function createItem(templateId: string, rarity: Rarity): GearItem {
  const t = getTemplate(templateId);
  return {
    id: uuid(),
    templateId,
    rarity,
    level: 1,
    equippedTo: null,
    slot: t.slot,
    stats: calcItemStats(templateId, 1, rarity),
    cp: calcItemCp(templateId, 1, rarity),
  };
}

/** Create a new Pet instance */
export function createPet(templateId: string, rarity: Rarity): Pet {
  const t = getTemplate(templateId);
  return {
    id: uuid(),
    templateId,
    name: t.name,
    rarity,
    level: 1,
    stats: calcItemStats(templateId, 1, rarity),
    cp: calcItemCp(templateId, 1, rarity),
    dungeonSlot: null,
  };
}

// ── Upgrade ───────────────────────────────────────────────────

interface UpgradeOptions {
  supportStoneBonus?: number; // flat % bonus (10, 20, or 30)
}

interface UpgradeCost {
  gold: number;
  mats: number;
  scrolls: number; // 0 for guaranteed, 1 for probability lv5+
  supportStoneId?: string;
}

/** Preview what an upgrade will cost before committing */
export function previewUpgradeCost(
  item: GearItem,
  opts: UpgradeOptions = {},
): UpgradeCost {
  const t = getTemplate(item.templateId);
  const gold = Math.round(
    t.goldCostBase * item.level * RARITY_STAT_MULT[item.rarity],
  );
  const mats = t.matsPerUpgrade;
  const needsScroll = t.upgradeType === 'probability' && item.level >= 5;
  const scrolls = needsScroll ? 1 : 0;
  return { gold, mats, scrolls };
}

/** Preview final success chance including support stone bonus */
export function previewSuccessChance(
  item: GearItem,
  supportStoneBonus = 0,
): number {
  const t = getTemplate(item.templateId);
  if (t.upgradeType === 'guaranteed') return 100;
  const base = getBaseSuccessRate(item.level);
  return Math.min(100, base + supportStoneBonus);
}

/**
 * Attempt to upgrade an item by one level.
 * Returns an UpgradeResult — does NOT mutate state directly.
 * Caller is responsible for applying result to GearState.
 */
export function attemptUpgrade(
  item: GearItem,
  opts: UpgradeOptions = {},
): UpgradeResult {
  if (item.level >= 25) {
    throw new Error('Item is already at max level (25)');
  }

  const t = getTemplate(item.templateId);
  const cost = previewUpgradeCost(item, opts);
  const chanceFinal = previewSuccessChance(item, opts.supportStoneBonus ?? 0);
  const chanceRolled = Math.random() * 100;

  const succeeded =
    t.upgradeType === 'guaranteed' || chanceRolled <= chanceFinal;

  const newLevel = succeeded ? item.level + 1 : Math.max(1, item.level - 1); // drop 1 level on fail, min level 1

  const updatedItem: GearItem = {
    ...item,
    level: newLevel,
    stats: calcItemStats(item.templateId, newLevel, item.rarity),
    cp: calcItemCp(item.templateId, newLevel, item.rarity),
  };

  return {
    outcome:
      t.upgradeType === 'guaranteed'
        ? 'guaranteed'
        : succeeded
          ? 'success'
          : 'fail',
    item: updatedItem,
    goldSpent: cost.gold,
    matsSpent: cost.mats,
    scrollsSpent: cost.scrolls,
    supportStoneUsed: (opts.supportStoneBonus ?? 0) > 0,
    chanceRolled: Math.round(chanceRolled * 10) / 10,
    chanceFinal,
  };
}

// ── Equip / unequip ───────────────────────────────────────────

/** Equip an item to a hero. Returns updated state. */
export function equipItem(
  state: GearState,
  itemId: string,
  heroId: string,
): GearState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);

  // Unequip whatever is currently in that slot
  const currentLoadout = state.loadouts[heroId] ?? {
    heroId,
    gear: {},
    pets: [null, null, null],
  };
  const slotKey = item.slot as Exclude<typeof item.slot, 'pet'>;
  const currentItem = currentLoadout.gear[slotKey];

  const items = state.items.map((i) => {
    if (i.id === itemId) return { ...i, equippedTo: heroId };
    if (i.id === currentItem?.id) return { ...i, equippedTo: null };
    return i;
  });

  const newLoadout: HeroLoadout = {
    ...currentLoadout,
    gear: {
      ...currentLoadout.gear,
      [slotKey]: { ...item, equippedTo: heroId },
    },
  };

  return {
    ...state,
    items,
    loadouts: { ...state.loadouts, [heroId]: newLoadout },
  };
}

/** Unequip an item from a hero. Returns updated state. */
export function unequipItem(
  state: GearState,
  itemId: string,
  heroId: string,
): GearState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);

  const loadout = state.loadouts[heroId];
  if (!loadout) return state;

  const slotKey = item.slot as Exclude<typeof item.slot, 'pet'>;
  const newGear = { ...loadout.gear };
  delete newGear[slotKey];

  return {
    ...state,
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, equippedTo: null } : i,
    ),
    loadouts: {
      ...state.loadouts,
      [heroId]: { ...loadout, gear: newGear },
    },
  };
}

/** Assign a pet to a dungeon slot (0,1,2) for a hero. */
export function assignPetSlot(
  state: GearState,
  petId: string,
  slot: 0 | 1 | 2 | null,
): GearState {
  return {
    ...state,
    pets: state.pets.map((p) =>
      p.id === petId ? { ...p, dungeonSlot: slot } : p,
    ),
  };
}

// ── Mythical upgrade ──────────────────────────────────────────

/**
 * Upgrade a Legendary item to Mythical by consuming another Legendary.
 * Both items must be the same templateId and at level 10.
 */
export function upgradeMythical(
  state: GearState,
  baseItemId: string,
  sacrificeItemId: string,
): GearState {
  const base = state.items.find((i) => i.id === baseItemId);
  const sacrifice = state.items.find((i) => i.id === sacrificeItemId);

  if (!base || !sacrifice) throw new Error('Item not found');
  if (base.templateId !== sacrifice.templateId)
    throw new Error('Items must be the same type to fuse');
  if (base.rarity !== 'legendary' || sacrifice.rarity !== 'legendary')
    throw new Error('Both items must be Legendary to fuse into Mythical');
  if (base.level < 10 || sacrifice.level < 10)
    throw new Error('Both items must be level 10 to fuse');

  const mythicalItem: GearItem = {
    ...base,
    rarity: 'mythical',
    stats: calcItemStats(base.templateId, 10, 'mythical'),
    cp: calcItemCp(base.templateId, 10, 'mythical'),
  };

  return {
    ...state,
    items: state.items
      .filter((i) => i.id !== sacrificeItemId)
      .map((i) => (i.id === baseItemId ? mythicalItem : i)),
  };
}

// ── Total loadout stats ───────────────────────────────────────

/** Sum all equipped gear + pets stats for a hero. */
export function calcLoadoutStats(state: GearState, heroId: string): StatBlock {
  const loadout = state.loadouts[heroId];
  if (!loadout) return emptyStats();

  const gearStats = Object.values(loadout.gear).reduce(
    (acc, item) => addStats(acc, item?.stats ?? emptyStats()),
    emptyStats(),
  );

  const petStats = state.pets
    .filter((p) => p.dungeonSlot !== null)
    .reduce((acc, p) => addStats(acc, p.stats), emptyStats());

  return addStats(gearStats, petStats);
}

/** Total CP contribution from all equipped gear + assigned pets. */
export function calcLoadoutCp(state: GearState, heroId: string): number {
  const loadout = state.loadouts[heroId];
  if (!loadout) return 0;

  const gearCp = Object.values(loadout.gear).reduce(
    (sum, item) => sum + (item?.cp ?? 0),
    0,
  );

  const petCp = state.pets
    .filter((p) => p.dungeonSlot !== null)
    .reduce((sum, p) => sum + p.cp, 0);

  return gearCp + petCp;
}

// ── State helpers ─────────────────────────────────────────────

export function initialGearState(): GearState {
  return {
    items: [],
    pets: [],
    loadouts: {},
    upgradeScrolls: 5, // start with 5 scrolls for tutorial
    supportStones: { stone_10: 2, stone_20: 1, stone_30: 0 },
  };
}

/** Apply an upgrade result to gear state (called after attemptUpgrade) */
export function applyUpgradeResult(
  state: GearState,
  result: UpgradeResult,
  supportStoneId?: string,
): GearState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === result.item.id ? result.item : i)),
    upgradeScrolls: state.upgradeScrolls - result.scrollsSpent,
    supportStones: supportStoneId
      ? {
          ...state.supportStones,
          [supportStoneId]: Math.max(
            0,
            (state.supportStones[supportStoneId] ?? 0) - 1,
          ),
        }
      : state.supportStones,
  };
}
