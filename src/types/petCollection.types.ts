// ─────────────────────────────────────────────────────────────
//  petCollection.types.ts
//  Types for the pet catching & collection system.
// ─────────────────────────────────────────────────────────────

export type PetRarity = 'rare' | 'legendary' | 'super_legendary';
export type PetZone  = 'rain_forest' | 'sea' | 'endless_fire';

// ── Rarity display ────────────────────────────────────────────

export const RARITY_COLOR: Record<PetRarity, string> = {
  rare:            '#60A5FA',   // blue
  legendary:       '#F5C842',   // gold
  super_legendary: '#C084FC',   // base purple (animated in UI)
};

// Rainbow colour cycle used by Super Legendary border animation
export const RAINBOW_CYCLE = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#C084FC',
  '#FF6B6B',
];

export const RARITY_LABEL: Record<PetRarity, string> = {
  rare:            'Rare',
  legendary:       'Legendary',
  super_legendary: 'Super Legendary',
};

// ── Zone display ──────────────────────────────────────────────

export const ZONE_LABEL: Record<PetZone, string> = {
  rain_forest:   'Rain Forest',
  sea:           'Sea',
  endless_fire:  'Endless Fire Domain',
};

export const ZONE_EMOJI: Record<PetZone, string> = {
  rain_forest:  '🌳',
  sea:          '🌊',
  endless_fire: '🔥',
};

export const ZONE_BG: Record<PetZone, string> = {
  rain_forest:  '#0D2B1A',
  sea:          '#0A1E3D',
  endless_fire: '#2B0D00',
};

// ── Data models ───────────────────────────────────────────────

export interface PetTemplate {
  id: string;
  name: string;
  emoji: string;
  rarity: PetRarity;
  zone: PetZone;
  baseHp: number;
  baseAtk: number;
  baseSpd: number;
  catchRateBase: number;   // 0–100 base catch %
  description: string;
}

/** A pet the player owns */
export interface OwnedPet {
  id: string;
  templateId: string;
  name: string;
  emoji: string;
  rarity: PetRarity;
  level: number;
  exp: number;
  maxHp: number;
  atk: number;
  spd: number;
}

/** A wild pet instance spawned during a zone encounter */
export interface WildPetInstance {
  template: PetTemplate;
  currentHp: number;
  maxHp: number;
  atk: number;
  spd: number;
}

// ── Battle ────────────────────────────────────────────────────

export interface BattleRound {
  attacker: 'player' | 'wild';
  damage: number;
  playerHpAfter: number;
  wildHpAfter: number;
}

export interface BattleResult {
  rounds: BattleRound[];
  winner: 'player' | 'wild';
  playerHpRemaining: number;
  playerHpMax: number;
  /** 0–1 ratio of player HP remaining; drives catch rate */
  performance: number;
}
