// ─────────────────────────────────────────────────────────────
//  lootTables.data.ts
//  Static data: all farm zones and their loot tables.
//  Add new zones here — the engine picks them up automatically.
// ─────────────────────────────────────────────────────────────

import type { FarmZone, LootTable } from '../types/farm.types';

// ── Loot Tables ───────────────────────────────────────────────
// Weights are relative — engine normalises them automatically.
// Keep weights as round integers so they're easy to balance.

export const LOOT_TABLES: Record<string, LootTable> = {
  loot_meadow: {
    id: 'loot_meadow',
    rollsPerTick: 1,
    entries: [
      { type: 'gold', weight: 55, amountMin: 8, amountMax: 18 },
      { type: 'xpBook', weight: 25, amountMin: 1, amountMax: 2 },
      { type: 'craftMat', weight: 15, amountMin: 1, amountMax: 1 },
      {
        type: 'item',
        weight: 4,
        rarity: 'common',
        itemTemplateId: 'wpn_iron_sword',
      },
      { type: 'summonScroll', weight: 1, amountMin: 1, amountMax: 1 },
    ],
  },

  loot_darkwood: {
    id: 'loot_darkwood',
    rollsPerTick: 1,
    entries: [
      { type: 'gold', weight: 45, amountMin: 25, amountMax: 55 },
      { type: 'xpBook', weight: 25, amountMin: 2, amountMax: 4 },
      { type: 'craftMat', weight: 15, amountMin: 1, amountMax: 3 },
      {
        type: 'item',
        weight: 10,
        rarity: 'rare',
        itemTemplateId: 'wpn_elven_bow',
      },
      {
        type: 'item',
        weight: 4,
        rarity: 'epic',
        itemTemplateId: 'arm_shadowweave',
      },
      { type: 'summonScroll', weight: 1, amountMin: 1, amountMax: 1 },
    ],
  },

  loot_dragon_peaks: {
    id: 'loot_dragon_peaks',
    rollsPerTick: 1,
    entries: [
      { type: 'gold', weight: 35, amountMin: 100, amountMax: 200 },
      { type: 'xpBook', weight: 20, amountMin: 3, amountMax: 8 },
      { type: 'craftMat', weight: 20, amountMin: 2, amountMax: 5 },
      {
        type: 'item',
        weight: 12,
        rarity: 'rare',
        itemTemplateId: 'arm_dragonscale',
      },
      {
        type: 'item',
        weight: 8,
        rarity: 'epic',
        itemTemplateId: 'wpn_flamebrand',
      },
      {
        type: 'item',
        weight: 3,
        rarity: 'legendary',
        itemTemplateId: 'rng_ember_signet',
      },
      { type: 'summonScroll', weight: 2, amountMin: 1, amountMax: 2 },
    ],
  },
};

// ── Farm Zones ────────────────────────────────────────────────
// Ordered from weakest to strongest.
// minCombatPower is the gate — hero CP must meet this value.

export const FARM_ZONES: FarmZone[] = [
  {
    id: 'zone_meadow',
    name: 'Sunlit Meadow',
    description: 'A peaceful field. Good for new heroes.',
    minCombatPower: 0,
    lootTableId: 'loot_meadow',
    tickIntervalSeconds: 60, // 1 roll per minute
    offlineCapHours: 12,
  },
  {
    id: 'zone_darkwood',
    name: 'Darkwood Forest',
    description: 'Wolves and bandits lurk among the trees.',
    minCombatPower: 1000,
    lootTableId: 'loot_darkwood',
    tickIntervalSeconds: 60,
    offlineCapHours: 10,
  },
  {
    id: 'zone_dragon_peaks',
    name: 'Dragon Peaks',
    description: 'Scorched highlands crawling with drakes.',
    minCombatPower: 5000,
    lootTableId: 'loot_dragon_peaks',
    tickIntervalSeconds: 60,
    offlineCapHours: 8, // higher zones have smaller offline caps
  },
];

/** Look up a zone by id. Throws if not found — callers should guard. */
export function getZone(zoneId: string): FarmZone {
  const zone = FARM_ZONES.find((z) => z.id === zoneId);
  if (!zone) throw new Error(`Unknown farm zone: ${zoneId}`);
  return zone;
}

/** Return zones the hero is eligible for given their combat power. */
export function getEligibleZones(combatPower: number): FarmZone[] {
  return FARM_ZONES.filter((z) => z.minCombatPower <= combatPower);
}
