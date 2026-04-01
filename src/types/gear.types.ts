// ─────────────────────────────────────────────────────────────
//  gear.types.ts
//  All types for the gear + pet system.
// ─────────────────────────────────────────────────────────────

// ── Rarity ───────────────────────────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythical: 'Mythical',
};

/** Border colour shown in UI per rarity */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#F87171',
  mythical: '#F5C842', // animated RGB in UI
};

/** Stat multiplier bonus per rarity (applied on top of base stats) */
export const RARITY_STAT_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.25,
  epic: 1.6,
  legendary: 2.1,
  mythical: 3.0,
};

// ── Slots ─────────────────────────────────────────────────────

export type GearSlot =
  | 'weapon'
  | 'armor'
  | 'helmet'
  | 'ring'
  | 'accessory'
  | 'boots'
  | 'necklace'
  | 'pet';

export const GEAR_SLOTS: GearSlot[] = [
  'weapon',
  'armor',
  'helmet',
  'ring',
  'accessory',
  'boots',
  'necklace',
  'pet',
];

export const SLOT_LABEL: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  helmet: 'Helmet',
  ring: 'Ring',
  accessory: 'Accessory',
  boots: 'Boots',
  necklace: 'Necklace',
  pet: 'Pet',
};

export const SLOT_ICON: Record<GearSlot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  helmet: '⛑️',
  ring: '💍',
  accessory: '🔮',
  boots: '👟',
  necklace: '📿',
  pet: '🐾',
};

// ── Stats ─────────────────────────────────────────────────────

export type StatKey = 'atk' | 'def' | 'hp' | 'crit' | 'critDmg';

export interface StatBlock {
  atk: number; // flat attack bonus
  def: number; // flat defence bonus
  hp: number; // flat HP bonus
  crit: number; // crit chance % (0-100)
  critDmg: number; // crit damage % multiplier bonus
}

export function emptyStats(): StatBlock {
  return { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0 };
}

export function addStats(a: StatBlock, b: StatBlock): StatBlock {
  return {
    atk: a.atk + b.atk,
    def: a.def + b.def,
    hp: a.hp + b.hp,
    crit: a.crit + b.crit,
    critDmg: a.critDmg + b.critDmg,
  };
}

// ── Upgrade type ──────────────────────────────────────────────

/**
 * 'guaranteed' — always succeeds, no scroll needed
 * 'probability' — 100% below lv5, decreasing % after lv5
 */
export type UpgradeType = 'guaranteed' | 'probability';

// ── Item template (static game data) ─────────────────────────

export interface ItemTemplate {
  id: string;
  name: string;
  slot: GearSlot;
  upgradeType: UpgradeType;
  /** Base stats at level 1, common rarity */
  baseStats: StatBlock;
  /** How much each stat grows per level */
  statPerLevel: StatBlock;
  /** CP value this item contributes at level 1 */
  baseCp: number;
  /** CP gained per upgrade level */
  cpPerLevel: number;
  /** Gold cost base for upgrading */
  goldCostBase: number;
  /** Craft mats required per upgrade */
  matsPerUpgrade: number;
  description: string;
}

// ── Item instance (owned by player) ──────────────────────────

export interface GearItem {
  id: string; // unique instance id
  templateId: string; // reference to ItemTemplate
  rarity: Rarity;
  level: number; // 1–10
  equippedTo: string | null; // heroId or null if in inventory
  slot: GearSlot;
  /** Computed stats cached — recalculate on level/rarity change */
  stats: StatBlock;
  cp: number;
}

// ── Pet instance ──────────────────────────────────────────────

export interface Pet {
  id: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  level: number;
  stats: StatBlock;
  cp: number;
  /** Which hero slot (0,1,2) this pet is assigned to in dungeons */
  dungeonSlot: 0 | 1 | 2 | null;
}

// ── Hero gear loadout ─────────────────────────────────────────

/** All 7 gear slots + up to 3 pet slots per hero */
export interface HeroLoadout {
  heroId: string;
  gear: Partial<Record<Exclude<GearSlot, 'pet'>, GearItem>>;
  pets: (Pet | null)[]; // always length 3
}

// ── Upgrade result ────────────────────────────────────────────

export type UpgradeOutcome = 'success' | 'fail' | 'guaranteed';

export interface UpgradeResult {
  outcome: UpgradeOutcome;
  item: GearItem; // updated item (level increased if success)
  goldSpent: number;
  matsSpent: number;
  scrollsSpent: number;
  supportStoneUsed: boolean;
  chanceRolled: number; // 0-100, what % was rolled (for UI feedback)
  chanceFinal: number; // final % after support stone bonus
}

// ── Support stone ─────────────────────────────────────────────

export interface SupportStone {
  id: string;
  bonusPercent: number; // +10, +20, or +30
  label: string;
}

export const SUPPORT_STONES: SupportStone[] = [
  { id: 'stone_10', bonusPercent: 10, label: '+10% Stone' },
  { id: 'stone_20', bonusPercent: 20, label: '+20% Stone' },
  { id: 'stone_30', bonusPercent: 30, label: '+30% Stone' },
];

// ── Gear inventory state ──────────────────────────────────────

export interface GearState {
  items: GearItem[];
  pets: Pet[];
  loadouts: Record<string, HeroLoadout>; // keyed by heroId
  /** Consumables in player inventory */
  upgradeScrolls: number;
  supportStones: Record<string, number>; // stoneId → count
}
