// ─────────────────────────────────────────────────────────────
//  gearTemplates.data.ts
//  Static item definitions. Add new items here.
//  Engine reads these — no engine changes needed for new gear.
// ─────────────────────────────────────────────────────────────

import type { ItemTemplate } from '../types/gear.types';

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  // ── WEAPONS (ATK focused, Type B — probability) ───────────
  wpn_iron_sword: {
    id: 'wpn_iron_sword',
    name: 'Iron Sword',
    slot: 'weapon',
    upgradeType: 'probability',
    baseStats: { atk: 50, def: 0, hp: 0, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 18, def: 0, hp: 0, crit: 0, critDmg: 0 },
    baseCp: 80,
    cpPerLevel: 25,
    goldCostBase: 200,
    matsPerUpgrade: 1,
    description: 'A reliable iron sword forged in the lowlands.',
  },
  wpn_elven_bow: {
    id: 'wpn_elven_bow',
    name: 'Elven Bow',
    slot: 'weapon',
    upgradeType: 'probability',
    baseStats: { atk: 40, def: 0, hp: 0, crit: 5, critDmg: 15 },
    statPerLevel: { atk: 14, def: 0, hp: 0, crit: 0.5, critDmg: 2 },
    baseCp: 100,
    cpPerLevel: 30,
    goldCostBase: 500,
    matsPerUpgrade: 2,
    description: 'A graceful bow carved from ancient silverwood.',
  },
  wpn_flamebrand: {
    id: 'wpn_flamebrand',
    name: 'Flamebrand',
    slot: 'weapon',
    upgradeType: 'probability',
    baseStats: { atk: 90, def: 0, hp: 0, crit: 3, critDmg: 20 },
    statPerLevel: { atk: 30, def: 0, hp: 0, crit: 0.5, critDmg: 3 },
    baseCp: 180,
    cpPerLevel: 55,
    goldCostBase: 1200,
    matsPerUpgrade: 3,
    description: 'A blade forged in dragonfire. Burns with endless fury.',
  },

  // ── ARMOR (DEF + HP focused, Type A — guaranteed) ─────────
  arm_leather_vest: {
    id: 'arm_leather_vest',
    name: 'Leather Vest',
    slot: 'armor',
    upgradeType: 'guaranteed',
    baseStats: { atk: 0, def: 40, hp: 200, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 0, def: 14, hp: 60, crit: 0, critDmg: 0 },
    baseCp: 70,
    cpPerLevel: 20,
    goldCostBase: 150,
    matsPerUpgrade: 1,
    description: 'Basic leather armor. Light and dependable.',
  },
  arm_shadowweave: {
    id: 'arm_shadowweave',
    name: 'Shadowweave Robe',
    slot: 'armor',
    upgradeType: 'guaranteed',
    baseStats: { atk: 0, def: 70, hp: 400, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 0, def: 24, hp: 120, crit: 0, critDmg: 0 },
    baseCp: 130,
    cpPerLevel: 38,
    goldCostBase: 600,
    matsPerUpgrade: 2,
    description: 'Woven from shadow threads. Absorbs magical damage.',
  },
  arm_dragonscale: {
    id: 'arm_dragonscale',
    name: 'Dragonscale Plate',
    slot: 'armor',
    upgradeType: 'probability',
    baseStats: { atk: 0, def: 130, hp: 700, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 0, def: 44, hp: 200, crit: 0, critDmg: 0 },
    baseCp: 220,
    cpPerLevel: 65,
    goldCostBase: 1500,
    matsPerUpgrade: 3,
    description: 'Forged from dragon scales. Near-impenetrable.',
  },

  // ── HELMET (HP + DEF, Type A) ─────────────────────────────
  helm_iron_cap: {
    id: 'helm_iron_cap',
    name: 'Iron Cap',
    slot: 'helmet',
    upgradeType: 'guaranteed',
    baseStats: { atk: 0, def: 25, hp: 300, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 0, def: 8, hp: 90, crit: 0, critDmg: 0 },
    baseCp: 60,
    cpPerLevel: 18,
    goldCostBase: 120,
    matsPerUpgrade: 1,
    description: 'A simple iron cap. Better than nothing.',
  },
  helm_arcane_crown: {
    id: 'helm_arcane_crown',
    name: 'Arcane Crown',
    slot: 'helmet',
    upgradeType: 'probability',
    baseStats: { atk: 20, def: 40, hp: 500, crit: 2, critDmg: 10 },
    statPerLevel: { atk: 6, def: 13, hp: 150, crit: 0.3, critDmg: 1.5 },
    baseCp: 140,
    cpPerLevel: 42,
    goldCostBase: 800,
    matsPerUpgrade: 2,
    description: 'A crown imbued with arcane runes.',
  },

  // ── RING (CRIT focused, Type B) ───────────────────────────
  rng_copper_band: {
    id: 'rng_copper_band',
    name: 'Copper Band',
    slot: 'ring',
    upgradeType: 'guaranteed',
    baseStats: { atk: 10, def: 0, hp: 0, crit: 2, critDmg: 5 },
    statPerLevel: { atk: 3, def: 0, hp: 0, crit: 0.4, critDmg: 1 },
    baseCp: 50,
    cpPerLevel: 15,
    goldCostBase: 100,
    matsPerUpgrade: 1,
    description: 'A plain copper band with a faint magical glow.',
  },
  rng_ember_signet: {
    id: 'rng_ember_signet',
    name: 'Ember Signet',
    slot: 'ring',
    upgradeType: 'probability',
    baseStats: { atk: 30, def: 0, hp: 0, crit: 8, critDmg: 30 },
    statPerLevel: { atk: 10, def: 0, hp: 0, crit: 0.8, critDmg: 4 },
    baseCp: 160,
    cpPerLevel: 48,
    goldCostBase: 1000,
    matsPerUpgrade: 2,
    description: 'A ring bearing an eternal ember. Raises critical fury.',
  },

  // ── BOOTS (DEF + SPD substitute via ATK, Type A) ──────────
  bts_worn_boots: {
    id: 'bts_worn_boots',
    name: 'Worn Boots',
    slot: 'boots',
    upgradeType: 'guaranteed',
    baseStats: { atk: 0, def: 20, hp: 150, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 0, def: 7, hp: 45, crit: 0, critDmg: 0 },
    baseCp: 45,
    cpPerLevel: 13,
    goldCostBase: 90,
    matsPerUpgrade: 1,
    description: 'Battered boots. They have seen many miles.',
  },
  bts_windrunner: {
    id: 'bts_windrunner',
    name: 'Windrunner Greaves',
    slot: 'boots',
    upgradeType: 'probability',
    baseStats: { atk: 15, def: 50, hp: 350, crit: 2, critDmg: 0 },
    statPerLevel: { atk: 5, def: 17, hp: 100, crit: 0.2, critDmg: 0 },
    baseCp: 120,
    cpPerLevel: 36,
    goldCostBase: 700,
    matsPerUpgrade: 2,
    description: 'Enchanted greaves. The wearer moves like the wind.',
  },

  // ── NECKLACE (HP + CRIT DMG, Type B) ──────────────────────
  nck_bone_pendant: {
    id: 'nck_bone_pendant',
    name: 'Bone Pendant',
    slot: 'necklace',
    upgradeType: 'guaranteed',
    baseStats: { atk: 0, def: 10, hp: 250, crit: 0, critDmg: 10 },
    statPerLevel: { atk: 0, def: 3, hp: 75, crit: 0, critDmg: 1.5 },
    baseCp: 55,
    cpPerLevel: 16,
    goldCostBase: 120,
    matsPerUpgrade: 1,
    description: 'Carved from ancient bone. Cold to the touch.',
  },
  nck_stormcall: {
    id: 'nck_stormcall',
    name: 'Stormcall Amulet',
    slot: 'necklace',
    upgradeType: 'probability',
    baseStats: { atk: 20, def: 20, hp: 500, crit: 3, critDmg: 35 },
    statPerLevel: { atk: 6, def: 6, hp: 150, crit: 0.3, critDmg: 5 },
    baseCp: 170,
    cpPerLevel: 50,
    goldCostBase: 1100,
    matsPerUpgrade: 3,
    description: 'Calls upon storm energy. Crits hit like lightning.',
  },

  // ── PETS (all Type A — guaranteed upgrades) ───────────────
  pet_slime: {
    id: 'pet_slime',
    name: 'Slime',
    slot: 'pet',
    upgradeType: 'guaranteed',
    baseStats: { atk: 10, def: 10, hp: 200, crit: 0, critDmg: 0 },
    statPerLevel: { atk: 3, def: 3, hp: 60, crit: 0, critDmg: 0 },
    baseCp: 40,
    cpPerLevel: 12,
    goldCostBase: 80,
    matsPerUpgrade: 1,
    description: 'A cheerful slime. Surprisingly resilient.',
  },
  pet_fox: {
    id: 'pet_fox',
    name: 'Spirit Fox',
    slot: 'pet',
    upgradeType: 'guaranteed',
    baseStats: { atk: 20, def: 5, hp: 150, crit: 5, critDmg: 10 },
    statPerLevel: { atk: 7, def: 2, hp: 45, crit: 0.5, critDmg: 1.5 },
    baseCp: 90,
    cpPerLevel: 28,
    goldCostBase: 300,
    matsPerUpgrade: 1,
    description: "A cunning fox spirit. Sharpens the hero's instincts.",
  },
  pet_dragon_hatchling: {
    id: 'pet_dragon_hatchling',
    name: 'Dragon Hatchling',
    slot: 'pet',
    upgradeType: 'probability',
    baseStats: { atk: 50, def: 20, hp: 400, crit: 4, critDmg: 20 },
    statPerLevel: { atk: 18, def: 7, hp: 120, crit: 0.4, critDmg: 3 },
    baseCp: 200,
    cpPerLevel: 60,
    goldCostBase: 1000,
    matsPerUpgrade: 2,
    description: 'A young dragon barely hatched. Enormous potential.',
  },
};

/** Get template by id — throws if not found */
export function getTemplate(templateId: string): ItemTemplate {
  const t = ITEM_TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown item template: ${templateId}`);
  return t;
}

/** All templates for a given slot */
export function getTemplatesBySlot(slot: string): ItemTemplate[] {
  return Object.values(ITEM_TEMPLATES).filter((t) => t.slot === slot);
}
