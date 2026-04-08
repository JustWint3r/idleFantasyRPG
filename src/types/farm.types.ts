// ─────────────────────────────────────────────────────────────
//  farm.types.ts
//  All shared types for the idle farm system.
//  Import these everywhere — never redefine locally.
// ─────────────────────────────────────────────────────────────

// ── Rarity ───────────────────────────────────────────────────
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

// ── Item ─────────────────────────────────────────────────────
export type GearSlot = 'weapon' | 'armor' | 'helmet' | 'ring' | 'boots' | 'necklace';

export interface Item {
  id: string; // unique instance id (uuid)
  templateId: string; // points to ItemTemplate
  rarity: Rarity;
  slot: GearSlot;
  level: number;
  statBonus: number; // flat bonus to hero CP from this item
}

// ── Resources ────────────────────────────────────────────────
export interface Resources {
  gold: number;
  xpBooks: number; // used to level heroes
  craftMats: number; // used to upgrade gear
  summonScrolls: number;
}

// ── Loot ─────────────────────────────────────────────────────

/** A single entry in a loot table. weight is relative probability. */
export interface LootEntry {
  type: 'gold' | 'xpBook' | 'craftMat' | 'summonScroll' | 'item';
  weight: number;
  /** For gold / xpBook / craftMat: how many are awarded */
  amountMin?: number;
  amountMax?: number;
  /** For item drops: which template to instantiate */
  itemTemplateId?: string;
  rarity?: Rarity;
}

export interface LootTable {
  id: string;
  /** How many individual rolls per tick (e.g. 1 roll every 60 s) */
  rollsPerTick: number;
  entries: LootEntry[];
}

/** Result of one farm session (offline or live) */
export interface FarmResult {
  durationSeconds: number;
  resources: Resources;
  items: Item[];
  rollCount: number;
}

// ── Hero (minimal subset needed by farm engine) ───────────────
export interface DeployedHero {
  id: string;
  name: string;
  level: number;
  stars: number;
  combatPower: number; // pre-computed, updated whenever hero changes
  zoneId: string; // which farm zone this hero is assigned to
  deployedAt: number; // Unix ms timestamp
}

// ── Farm Zone ─────────────────────────────────────────────────
export interface FarmZone {
  id: string;
  name: string;
  description: string;
  minCombatPower: number; // hero must meet this to be deployed here
  lootTableId: string;
  /** Seconds between each loot table roll */
  tickIntervalSeconds: number;
  /** Max offline accumulation hours (prevents infinite AFK abuse) */
  offlineCapHours: number;
}

// ── Persistent farm state (what gets saved to AsyncStorage) ───
export interface FarmState {
  deployedHero: DeployedHero | null;
  lastSavedAt: number; // Unix ms
  pendingResources: Resources;
  pendingItems: Item[];
  /** Total seconds farmed lifetime (for analytics / achievements) */
  totalSecondsFarmed: number;
}

// ── Offline session summary (shown to player on return) ───────
export interface OfflineSummary {
  heroName: string;
  zoneName: string;
  durationSeconds: number;
  wasCapped: boolean; // true if we hit offlineCapHours
  result: FarmResult;
}
