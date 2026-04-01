// ─────────────────────────────────────────────────────────────
//  farmEngine.test.ts
//  Run with: npx jest src/engine/farmEngine.test.ts
// ─────────────────────────────────────────────────────────────

import {
  calculateOfflineFarm,
  claimPending,
  deployHero,
  emptyResources,
  rollLootTable,
  tickFarm,
  undeployHero,
} from './farmEngine';

import type { FarmState, DeployedHero } from '../types/farm.types';
import { FARM_ZONES } from '../data/lootTables.data';

// ── Fixtures ──────────────────────────────────────────────────

const MEADOW = FARM_ZONES[0]; // zone_meadow, tickInterval=60s
const DARKWOOD = FARM_ZONES[1];

function makeState(overrides: Partial<FarmState> = {}): FarmState {
  return {
    deployedHero: null,
    lastSavedAt: 0,
    pendingResources: emptyResources(),
    pendingItems: [],
    totalSecondsFarmed: 0,
    ...overrides,
  };
}

function makeHero(overrides: Partial<DeployedHero> = {}): DeployedHero {
  return {
    id: 'hero_test',
    name: 'Test Hero',
    level: 10,
    stars: 1,
    combatPower: 500,
    zoneId: MEADOW.id,
    deployedAt: 0,
    ...overrides,
  };
}

// ── rollLootTable ──────────────────────────────────────────────

describe('rollLootTable', () => {
  it('returns zero resources for zero rolls', () => {
    const table = {
      id: 't1',
      rollsPerTick: 1,
      entries: [{ type: 'gold' as const, weight: 100, amountMin: 10, amountMax: 10 }],
    };
    const { resources, items } = rollLootTable(table, 0);
    expect(resources.gold).toBe(0);
    expect(items).toHaveLength(0);
  });

  it('accumulates gold across many rolls', () => {
    const table = {
      id: 't2',
      rollsPerTick: 1,
      entries: [{ type: 'gold' as const, weight: 100, amountMin: 5, amountMax: 5 }],
    };
    const { resources } = rollLootTable(table, 10);
    // Every roll is gold-only at exactly 5 gold → 10 * 1 roll * 5 = 50
    expect(resources.gold).toBe(50);
  });

  it('never produces negative amounts', () => {
    const table = {
      id: 't3',
      rollsPerTick: 3,
      entries: [
        { type: 'gold' as const, weight: 50, amountMin: 1, amountMax: 100 },
        { type: 'xpBook' as const, weight: 50, amountMin: 1, amountMax: 1 },
      ],
    };
    for (let i = 0; i < 20; i++) {
      const { resources } = rollLootTable(table, 10);
      expect(resources.gold).toBeGreaterThanOrEqual(0);
      expect(resources.xpBooks).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── deployHero ────────────────────────────────────────────────

describe('deployHero', () => {
  it('sets deployedHero on the state', () => {
    const state = makeState();
    const hero = makeHero({ combatPower: 0 });
    const next = deployHero(state, hero, MEADOW, 1000);
    expect(next.deployedHero).not.toBeNull();
    expect(next.deployedHero!.zoneId).toBe(MEADOW.id);
  });

  it('throws when hero CP is below zone minimum', () => {
    const state = makeState();
    const hero = makeHero({ combatPower: 500 }); // Darkwood requires 1000
    expect(() => deployHero(state, hero, DARKWOOD, 1000)).toThrow();
  });

  it('stamps deployedAt with the provided timestamp', () => {
    const state = makeState();
    const hero = makeHero();
    const now = 99999;
    const next = deployHero(state, hero, MEADOW, now);
    expect(next.deployedHero!.deployedAt).toBe(now);
    expect(next.lastSavedAt).toBe(now);
  });
});

// ── tickFarm ──────────────────────────────────────────────────

describe('tickFarm', () => {
  it('returns null when no hero is deployed', () => {
    const state = makeState();
    expect(tickFarm(state, 60_000)).toBeNull();
  });

  it('returns null when less than one tick has elapsed', () => {
    const hero = makeHero();
    const state = makeState({
      deployedHero: hero,
      lastSavedAt: 0,
    });
    // Meadow tick = 60s. Only 30s elapsed.
    expect(tickFarm(state, 30_000)).toBeNull();
  });

  it('returns a result after one tick interval', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });
    const result = tickFarm(state, 61_000); // 61s > 60s tick
    expect(result).not.toBeNull();
    expect(result!.rollCount).toBe(1);
  });

  it('awards multiple rolls for multiple elapsed intervals', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });
    const result = tickFarm(state, 300_000); // 300s = 5 ticks
    expect(result).not.toBeNull();
    expect(result!.rollCount).toBe(5);
  });
});

// ── calculateOfflineFarm ───────────────────────────────────────

describe('calculateOfflineFarm', () => {
  it('returns null when no hero is deployed', () => {
    const state = makeState({ lastSavedAt: 0 });
    expect(calculateOfflineFarm(state, 100_000)).toBeNull();
  });

  it('caps elapsed time at zone offlineCapHours', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });

    // Simulate 24 hours offline (meadow cap is 12h)
    const summary = calculateOfflineFarm(state, 24 * 3600 * 1000);
    expect(summary).not.toBeNull();
    expect(summary!.wasCapped).toBe(true);

    // Effective duration should be capped at 12 * 3600 = 43200s
    expect(summary!.durationSeconds).toBe(MEADOW.offlineCapHours * 3600);
  });

  it('is not capped for short offline periods', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });

    // 2 hours offline, cap is 12h
    const summary = calculateOfflineFarm(state, 2 * 3600 * 1000);
    expect(summary!.wasCapped).toBe(false);
  });

  it('returns null if less than one tick elapsed', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });
    // Only 30 seconds elapsed — less than 60s tick
    expect(calculateOfflineFarm(state, 30_000)).toBeNull();
  });
});

// ── claimPending ──────────────────────────────────────────────

describe('claimPending', () => {
  it('returns all pending resources and zeroes them out', () => {
    const state = makeState({
      pendingResources: { gold: 500, xpBooks: 3, craftMats: 1, summonScrolls: 0 },
    });
    const { claimed, newState } = claimPending(state);
    expect(claimed.resources.gold).toBe(500);
    expect(newState.pendingResources.gold).toBe(0);
    expect(newState.pendingResources.xpBooks).toBe(0);
  });

  it('returns all pending items and clears the list', () => {
    const state = makeState({
      pendingItems: [
        { id: 'i1', templateId: 'sword', rarity: 'rare', slot: 'weapon', level: 1, statBonus: 50 },
      ],
    });
    const { claimed, newState } = claimPending(state);
    expect(claimed.items).toHaveLength(1);
    expect(newState.pendingItems).toHaveLength(0);
  });
});

// ── undeployHero ──────────────────────────────────────────────

describe('undeployHero', () => {
  it('sets deployedHero to null', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });
    const { newState } = undeployHero(state, 120_000);
    expect(newState.deployedHero).toBeNull();
  });

  it('accumulates pending resources from partial ticks', () => {
    const hero = makeHero();
    const state = makeState({ deployedHero: hero, lastSavedAt: 0 });
    // 120s = 2 full ticks on meadow (60s each)
    const { newState, pendingResult } = undeployHero(state, 120_000);
    expect(pendingResult).not.toBeNull();
    expect(pendingResult!.rollCount).toBe(2);
  });
});
