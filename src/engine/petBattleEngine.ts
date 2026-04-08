// ─────────────────────────────────────────────────────────────
//  petBattleEngine.ts
//  Pure logic for: pet spawning, auto-battle simulation,
//  catch-rate calculation, and pet creation helpers.
// ─────────────────────────────────────────────────────────────

import type {
  BattleResult,
  OwnedPet,
  PetRarity,
  PetTemplate,
  PetZone,
  WildPetInstance,
} from '../types/petCollection.types';

// ── Pet templates ─────────────────────────────────────────────

export const PET_TEMPLATES: PetTemplate[] = [
  // ── Rain Forest ──────────────────────────────────────────
  {
    id: 'forest_sprite',
    name: 'Forest Sprite',
    emoji: '🧚',
    rarity: 'rare',
    zone: 'rain_forest',
    baseHp: 80, baseAtk: 15, baseSpd: 20,
    catchRateBase: 60,
    description: 'A nimble spirit that dances among the ancient trees.',
  },
  {
    id: 'ancient_treant',
    name: 'Ancient Treant',
    emoji: '🌲',
    rarity: 'legendary',
    zone: 'rain_forest',
    baseHp: 200, baseAtk: 35, baseSpd: 8,
    catchRateBase: 28,
    description: 'A sentient tree that has stood for a thousand years.',
  },
  {
    id: 'primordial_dragon',
    name: 'Primordial Dragon',
    emoji: '🐲',
    rarity: 'super_legendary',
    zone: 'rain_forest',
    baseHp: 380, baseAtk: 70, baseSpd: 30,
    catchRateBase: 8,
    description: 'The first dragon, born from the roots of creation itself.',
  },

  // ── Sea ──────────────────────────────────────────────────
  {
    id: 'coral_fairy',
    name: 'Coral Fairy',
    emoji: '🧜',
    rarity: 'rare',
    zone: 'sea',
    baseHp: 70, baseAtk: 18, baseSpd: 22,
    catchRateBase: 60,
    description: 'A delicate creature sworn to protect the coral reefs.',
  },
  {
    id: 'kraken_pup',
    name: 'Kraken Pup',
    emoji: '🦑',
    rarity: 'legendary',
    zone: 'sea',
    baseHp: 220, baseAtk: 40, baseSpd: 12,
    catchRateBase: 28,
    description: 'Young offspring of the great ocean terror.',
  },
  {
    id: 'abyssal_leviathan',
    name: 'Abyssal Leviathan',
    emoji: '🐉',
    rarity: 'super_legendary',
    zone: 'sea',
    baseHp: 400, baseAtk: 75, baseSpd: 18,
    catchRateBase: 8,
    description: 'A serpentine titan risen from the deepest trench.',
  },

  // ── Endless Fire Domain ───────────────────────────────────
  {
    id: 'ember_fox',
    name: 'Ember Fox',
    emoji: '🦊',
    rarity: 'rare',
    zone: 'endless_fire',
    baseHp: 75, baseAtk: 20, baseSpd: 25,
    catchRateBase: 60,
    description: 'A quick fox whose fur crackles with living flame.',
  },
  {
    id: 'magma_golem',
    name: 'Magma Golem',
    emoji: '🗿',
    rarity: 'legendary',
    zone: 'endless_fire',
    baseHp: 240, baseAtk: 45, baseSpd: 6,
    catchRateBase: 28,
    description: 'A colossal being forged from the heart of a volcano.',
  },
  {
    id: 'phoenix_emperor',
    name: 'Phoenix Emperor',
    emoji: '🦅',
    image: require('../../assets/pets/phoenix_emperor.gif'),
    rarity: 'super_legendary',
    zone: 'endless_fire',
    baseHp: 360, baseAtk: 80, baseSpd: 35,
    catchRateBase: 8,
    description: 'The immortal sovereign of eternal flame.',
  },
];

export const PET_TEMPLATES_BY_ZONE: Record<PetZone, PetTemplate[]> = {
  rain_forest:  PET_TEMPLATES.filter((t) => t.zone === 'rain_forest'),
  sea:          PET_TEMPLATES.filter((t) => t.zone === 'sea'),
  endless_fire: PET_TEMPLATES.filter((t) => t.zone === 'endless_fire'),
};

// ── Spawning ──────────────────────────────────────────────────

const RARITY_WEIGHTS: Record<PetRarity, number> = {
  rare:            70,
  legendary:       25,
  super_legendary:  5,
};

function weightedPick(zone: PetZone): PetTemplate {
  const pool = PET_TEMPLATES_BY_ZONE[zone];
  const total = pool.reduce((s, t) => s + RARITY_WEIGHTS[t.rarity], 0);
  let roll = Math.random() * total;
  for (const t of pool) {
    roll -= RARITY_WEIGHTS[t.rarity];
    if (roll <= 0) return t;
  }
  return pool[0];
}

function makeWildInstance(template: PetTemplate): WildPetInstance {
  const v = 0.9 + Math.random() * 0.2; // 90 – 110 % variance
  const hp = Math.round(template.baseHp * v);
  return {
    template,
    currentHp: hp,
    maxHp: hp,
    atk: Math.round(template.baseAtk * v),
    spd: Math.round(template.baseSpd * v),
  };
}

/** Spawn 3 unique wild pets for a zone encounter */
export function spawnWildPets(zone: PetZone): WildPetInstance[] {
  const seen = new Set<string>();
  const result: WildPetInstance[] = [];
  let attempts = 0;
  while (result.length < 3 && attempts < 50) {
    attempts++;
    const t = weightedPick(zone);
    if (!seen.has(t.id)) {
      seen.add(t.id);
      result.push(makeWildInstance(t));
    }
  }
  return result;
}

// ── Battle simulation ─────────────────────────────────────────

function rollDmg(atk: number): number {
  const variance = Math.floor(Math.random() * 11) - 5; // ± 5
  return Math.max(1, atk + variance);
}

/** Fully simulate a battle and return the complete log */
export function simulateBattle(myPet: OwnedPet, wildPet: WildPetInstance): BattleResult {
  let playerHp = myPet.maxHp;
  let wildHp   = wildPet.maxHp;
  const rounds = [];

  // Faster pet goes first
  let turn: 'player' | 'wild' = myPet.spd >= wildPet.spd ? 'player' : 'wild';

  while (playerHp > 0 && wildHp > 0 && rounds.length < 200) {
    if (turn === 'player') {
      const dmg = rollDmg(myPet.atk);
      wildHp = Math.max(0, wildHp - dmg);
      rounds.push({ attacker: 'player' as const, damage: dmg, playerHpAfter: playerHp, wildHpAfter: wildHp });
    } else {
      const dmg = rollDmg(wildPet.atk);
      playerHp = Math.max(0, playerHp - dmg);
      rounds.push({ attacker: 'wild' as const, damage: dmg, playerHpAfter: playerHp, wildHpAfter: wildHp });
    }
    turn = turn === 'player' ? 'wild' : 'player';
  }

  const winner: 'player' | 'wild' = playerHp > 0 ? 'player' : 'wild';
  return {
    rounds,
    winner,
    playerHpRemaining: Math.max(0, playerHp),
    playerHpMax: myPet.maxHp,
    performance: winner === 'player' ? playerHp / myPet.maxHp : 0,
  };
}

// ── Catch rate ────────────────────────────────────────────────

/**
 * Calculate catch % from battle performance.
 * performance 0–1 → multiplier 0.5–2.0
 * Rarer pets have a lower base, capped at 95 %.
 */
export function calcCatchRate(template: PetTemplate, performance: number): number {
  const multiplier = 0.5 + performance * 1.5;
  return Math.min(95, Math.round(template.catchRateBase * multiplier));
}

export function attemptCatch(catchRate: number): boolean {
  return Math.random() * 100 < catchRate;
}

// ── Pet helpers ───────────────────────────────────────────────

export function ownedPetFromTemplate(template: PetTemplate): OwnedPet {
  return {
    id: `pet_${template.id}_${Date.now()}`,
    templateId: template.id,
    name: template.name,
    emoji: template.emoji,
    image: template.image,
    rarity: template.rarity,
    level: 1,
    exp: 0,
    maxHp: template.baseHp,
    atk: template.baseAtk,
    spd: template.baseSpd,
  };
}

/** Auto-generated starter pet for new players */
export function createStarterPet(): OwnedPet {
  const template = PET_TEMPLATES.find((t) => t.id === 'ember_fox')!;
  return { ...ownedPetFromTemplate(template), id: `pet_starter_${Date.now()}` };
}

/** EXP needed to reach next level */
export const MAX_PET_LEVEL = 50;

export function expToNextLevel(level: number): number {
  return level * 50;
}

/** Total EXP needed to reach max level from current level + exp */
export function expToMax(pet: OwnedPet): number {
  if (pet.level >= MAX_PET_LEVEL) return 0;
  let total = expToNextLevel(pet.level) - pet.exp;
  for (let lv = pet.level + 1; lv < MAX_PET_LEVEL; lv++) {
    total += expToNextLevel(lv);
  }
  return total;
}

/** Feed a pet (add EXP, level up if threshold reached, capped at MAX_PET_LEVEL) */
export function feedPet(pet: OwnedPet, expGain: number): OwnedPet {
  let { level, exp, maxHp, atk, spd } = pet;
  exp += expGain;
  while (level < MAX_PET_LEVEL && exp >= expToNextLevel(level)) {
    exp -= expToNextLevel(level);
    level++;
    maxHp  = Math.round(maxHp  * 1.08);
    atk    = Math.round(atk    * 1.06);
    spd    = Math.round(spd    * 1.04);
  }
  if (level >= MAX_PET_LEVEL) exp = 0;
  return { ...pet, level, exp, maxHp, atk, spd };
}
