// ─────────────────────────────────────────────────────────────
//  farmEngine.ts
//  Pure calculation logic — zero React, zero AsyncStorage.
//  Everything here is a deterministic function: same input → same
//  output. This makes it trivially unit-testable.
// ─────────────────────────────────────────────────────────────

import * as Crypto from 'expo-crypto';
const uuid = () => Crypto.randomUUID();

import type {
  DeployedHero,
  FarmResult,
  FarmState,
  FarmZone,
  Item,
  LootEntry,
  LootTable,
  OfflineSummary,
  Resources,
} from '../types/farm.types';
import { LOOT_TABLES, getZone } from '../data/lootTables.data';

// ── Helpers ───────────────────────────────────────────────────

/** Inclusive integer random between min and max. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick one entry from a weighted list. O(n) — fine for small tables. */
function weightedPick<T extends { weight: number }>(entries: T[]): T {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1]; // fallback (floating point safety)
}

/** Turn a raw LootEntry into a resolved Item instance. */
function resolveItemDrop(entry: LootEntry): Item {
  return {
    id: uuid(),
    templateId: entry.itemTemplateId ?? 'item_unknown',
    rarity: entry.rarity ?? 'common',
    slot: 'weapon', // real implementation: look up from ItemTemplate
    level: 1,
    statBonus: 0,
  };
}

/** Zero-value Resources object. */
export function emptyResources(): Resources {
  return { gold: 0, xpBooks: 0, craftMats: 0, summonScrolls: 0 };
}

/** Merge two Resources objects (non-mutating). */
export function addResources(a: Resources, b: Resources): Resources {
  return {
    gold: a.gold + b.gold,
    xpBooks: a.xpBooks + b.xpBooks,
    craftMats: a.craftMats + b.craftMats,
    summonScrolls: a.summonScrolls + b.summonScrolls,
  };
}

// ── Core loot roll ────────────────────────────────────────────

/**
 * Execute N rolls on a loot table.
 * Returns the aggregated resource gains and any item drops.
 *
 * This is the hot path — called once per offline session and
 * once per live tick. Keep it fast and allocation-light.
 */
export function rollLootTable(
  table: LootTable,
  rolls: number,
): { resources: Resources; items: Item[] } {
  const resources = emptyResources();
  const items: Item[] = [];

  for (let i = 0; i < rolls; i++) {
    for (let r = 0; r < table.rollsPerTick; r++) {
      const entry = weightedPick(table.entries);

      switch (entry.type) {
        case 'gold':
          resources.gold += randInt(entry.amountMin ?? 1, entry.amountMax ?? 1);
          break;
        case 'xpBook':
          resources.xpBooks += randInt(
            entry.amountMin ?? 1,
            entry.amountMax ?? 1,
          );
          break;
        case 'craftMat':
          resources.craftMats += randInt(
            entry.amountMin ?? 1,
            entry.amountMax ?? 1,
          );
          break;
        case 'summonScroll':
          resources.summonScrolls += randInt(
            entry.amountMin ?? 1,
            entry.amountMax ?? 1,
          );
          break;
        case 'item':
          items.push(resolveItemDrop(entry));
          break;
      }
    }
  }

  return { resources, items };
}

// ── Offline calculation ───────────────────────────────────────

/**
 * Calculate what a hero earned while the app was closed.
 *
 * Call this once on app launch (after loading FarmState from storage).
 * Returns null if no hero was deployed, or if < 1 full tick has elapsed.
 */
export function calculateOfflineFarm(
  state: FarmState,
  nowMs: number = Date.now(),
): OfflineSummary | null {
  const { deployedHero, lastSavedAt } = state;
  if (!deployedHero) return null;

  const zone = getZone(deployedHero.zoneId);
  const table = LOOT_TABLES[zone.lootTableId];
  if (!table) return null;

  const elapsedSeconds = (nowMs - lastSavedAt) / 1000;
  const capSeconds = zone.offlineCapHours * 3600;

  // Apply offline cap — players can't farm indefinitely while AFK
  const effectiveSeconds = Math.min(elapsedSeconds, capSeconds);
  const wasCapped = elapsedSeconds > capSeconds;

  // How many complete ticks happened in that time window?
  const rolls = Math.floor(effectiveSeconds / zone.tickIntervalSeconds);
  if (rolls < 1) return null;

  const { resources, items } = rollLootTable(table, rolls);

  const result: FarmResult = {
    durationSeconds: effectiveSeconds,
    resources,
    items,
    rollCount: rolls,
  };

  return {
    heroName: deployedHero.name,
    zoneName: zone.name,
    durationSeconds: effectiveSeconds,
    wasCapped,
    result,
  };
}

// ── Live tick ─────────────────────────────────────────────────

/**
 * Execute one live farm tick (called by the game loop every N seconds).
 * Returns the loot gained this tick, or null if no hero is deployed
 * or the tick interval hasn't elapsed yet.
 *
 * @param state       Current farm state
 * @param nowMs       Current timestamp (injectable for testing)
 */
export function tickFarm(
  state: FarmState,
  nowMs: number = Date.now(),
): FarmResult | null {
  const { deployedHero, lastSavedAt } = state;
  if (!deployedHero) return null;

  const zone = getZone(deployedHero.zoneId);
  const table = LOOT_TABLES[zone.lootTableId];
  if (!table) return null;

  const elapsedSeconds = (nowMs - lastSavedAt) / 1000;
  const rolls = Math.floor(elapsedSeconds / zone.tickIntervalSeconds);
  if (rolls < 1) return null;

  const { resources, items } = rollLootTable(table, rolls);

  return {
    durationSeconds: elapsedSeconds,
    resources,
    items,
    rollCount: rolls,
  };
}

// ── Deploy / undeploy ────────────────────────────────────────

/**
 * Deploy a hero to a zone.
 * Validates CP requirement. Returns updated state or throws.
 */
export function deployHero(
  state: FarmState,
  hero: DeployedHero,
  zone: FarmZone,
  nowMs: number = Date.now(),
): FarmState {
  if (hero.combatPower < zone.minCombatPower) {
    throw new Error(
      `Hero CP (${hero.combatPower}) is below zone minimum (${zone.minCombatPower})`,
    );
  }

  return {
    ...state,
    deployedHero: { ...hero, zoneId: zone.id, deployedAt: nowMs },
    lastSavedAt: nowMs,
  };
}

/**
 * Undeploy the current hero and collect any pending rewards.
 * Always call this before swapping heroes or closing the game.
 */
export function undeployHero(
  state: FarmState,
  nowMs: number = Date.now(),
): { newState: FarmState; pendingResult: FarmResult | null } {
  const pendingResult = tickFarm(state, nowMs);

  const newPendingResources = pendingResult
    ? addResources(state.pendingResources, pendingResult.resources)
    : state.pendingResources;

  const newPendingItems = pendingResult
    ? [...state.pendingItems, ...pendingResult.items]
    : state.pendingItems;

  return {
    newState: {
      ...state,
      deployedHero: null,
      lastSavedAt: nowMs,
      pendingResources: newPendingResources,
      pendingItems: newPendingItems,
      totalSecondsFarmed:
        state.totalSecondsFarmed + (pendingResult?.durationSeconds ?? 0),
    },
    pendingResult,
  };
}

/**
 * Claim all pending resources and items into the player's main inventory.
 * Call this after the player taps "Collect" on the offline summary screen.
 * Returns the claimed loot and a zeroed-out pending state.
 */
export function claimPending(state: FarmState): {
  claimed: { resources: Resources; items: Item[] };
  newState: FarmState;
} {
  const claimed = {
    resources: { ...state.pendingResources },
    items: [...state.pendingItems],
  };

  return {
    claimed,
    newState: {
      ...state,
      pendingResources: emptyResources(),
      pendingItems: [],
    },
  };
}

// ── Gold-per-hour estimate ─────────────────────────────────────

/**
 * Estimate average gold/hour for a given zone.
 * Useful for displaying expected earnings in the zone select UI.
 */
export function estimateGoldPerHour(zone: FarmZone): number {
  const table = LOOT_TABLES[zone.lootTableId];
  if (!table) return 0;

  const ticksPerHour = 3600 / zone.tickIntervalSeconds;
  const goldEntries = table.entries.filter((e) => e.type === 'gold');
  const totalWeight = table.entries.reduce((s, e) => s + e.weight, 0);

  const avgGoldPerRoll = goldEntries.reduce((sum, e) => {
    const prob = e.weight / totalWeight;
    const avgAmount = ((e.amountMin ?? 0) + (e.amountMax ?? 0)) / 2;
    return sum + prob * avgAmount * table.rollsPerTick;
  }, 0);

  return Math.round(avgGoldPerRoll * ticksPerHour);
}
