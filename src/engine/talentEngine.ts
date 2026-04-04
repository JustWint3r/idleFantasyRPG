// ─────────────────────────────────────────────────────────────
//  talentEngine.ts
//  Static node definitions + pure logic functions.
// ─────────────────────────────────────────────────────────────

import type {
  HeroTalentState,
  TalentBonuses,
  TalentNode,
  TalentState,
} from '../types/talent.types';

// ── Node definitions ──────────────────────────────────────────

export const TALENT_NODES: TalentNode[] = [
  // ATK branch
  {
    id: 'atk_1',
    branch: 'atk',
    tier: 1,
    name: 'Power Strike',
    description: '+5% ATK',
    cost: 1,
    atkPct: 5,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'atk_2',
    branch: 'atk',
    tier: 2,
    name: 'Battle Fury',
    description: '+10% ATK',
    cost: 2,
    atkPct: 10,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'atk_3',
    branch: 'atk',
    tier: 3,
    name: 'Devastation',
    description: '+15% ATK',
    cost: 3,
    atkPct: 15,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'atk_4',
    branch: 'atk',
    tier: 4,
    name: 'Overwhelming',
    description: '+20% ATK',
    cost: 5,
    atkPct: 20,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'atk_5',
    branch: 'atk',
    tier: 5,
    name: 'Warlord',
    description: '+30% ATK (mastery)',
    cost: 8,
    atkPct: 30,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },

  // DEF branch
  {
    id: 'def_1',
    branch: 'def',
    tier: 1,
    name: 'Toughened Skin',
    description: '+5% DEF',
    cost: 1,
    atkPct: 0,
    defPct: 5,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'def_2',
    branch: 'def',
    tier: 2,
    name: 'Battle Hardened',
    description: '+10% DEF',
    cost: 2,
    atkPct: 0,
    defPct: 10,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'def_3',
    branch: 'def',
    tier: 3,
    name: 'Fortress',
    description: '+15% DEF',
    cost: 3,
    atkPct: 0,
    defPct: 15,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'def_4',
    branch: 'def',
    tier: 4,
    name: 'Unbreakable',
    description: '+20% DEF',
    cost: 5,
    atkPct: 0,
    defPct: 20,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'def_5',
    branch: 'def',
    tier: 5,
    name: 'Iron Wall',
    description: '+30% DEF (mastery)',
    cost: 8,
    atkPct: 0,
    defPct: 30,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  },

  // HP branch
  {
    id: 'hp_1',
    branch: 'hp',
    tier: 1,
    name: 'Hardy',
    description: '+5% HP',
    cost: 1,
    atkPct: 0,
    defPct: 0,
    hpPct: 5,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'hp_2',
    branch: 'hp',
    tier: 2,
    name: 'Endurance',
    description: '+10% HP',
    cost: 2,
    atkPct: 0,
    defPct: 0,
    hpPct: 10,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'hp_3',
    branch: 'hp',
    tier: 3,
    name: 'Vigor',
    description: '+15% HP',
    cost: 3,
    atkPct: 0,
    defPct: 0,
    hpPct: 15,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'hp_4',
    branch: 'hp',
    tier: 4,
    name: 'Resilience',
    description: '+20% HP',
    cost: 5,
    atkPct: 0,
    defPct: 0,
    hpPct: 20,
    critPct: 0,
    critDmgPct: 0,
  },
  {
    id: 'hp_5',
    branch: 'hp',
    tier: 5,
    name: 'Titan',
    description: '+30% HP (mastery)',
    cost: 8,
    atkPct: 0,
    defPct: 0,
    hpPct: 30,
    critPct: 0,
    critDmgPct: 0,
  },

  // Utility branch
  {
    id: 'utl_1',
    branch: 'utility',
    tier: 1,
    name: 'Sharp Eye',
    description: '+2% CRIT chance',
    cost: 1,
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 2,
    critDmgPct: 0,
  },
  {
    id: 'utl_2',
    branch: 'utility',
    tier: 2,
    name: 'Hawk Eye',
    description: '+4% CRIT chance',
    cost: 2,
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 4,
    critDmgPct: 0,
  },
  {
    id: 'utl_3',
    branch: 'utility',
    tier: 3,
    name: 'Executioner',
    description: '+15% CRIT DMG',
    cost: 3,
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 15,
  },
  {
    id: 'utl_4',
    branch: 'utility',
    tier: 4,
    name: 'Annihilator',
    description: '+25% CRIT DMG',
    cost: 5,
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 25,
  },
  {
    id: 'utl_5',
    branch: 'utility',
    tier: 5,
    name: 'Lethal Strike',
    description: '+8% CRIT, +40% CRIT DMG (mastery)',
    cost: 8,
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 8,
    critDmgPct: 40,
  },
];

export const NODES_BY_ID = Object.fromEntries(
  TALENT_NODES.map((n) => [n.id, n]),
);
export const NODES_BY_BRANCH = TALENT_NODES.reduce<
  Record<string, TalentNode[]>
>((acc, n) => {
  if (!acc[n.branch]) acc[n.branch] = [];
  acc[n.branch].push(n);
  return acc;
}, {});

// ── State helpers ──────────────────────────────────────────────

export function initialHeroTalentState(heroId: string): HeroTalentState {
  return { heroId, talentPoints: 5, totalEarned: 5, unlockedNodes: [] };
}

export function initialTalentState(): TalentState {
  return { heroes: {} };
}

export function getHeroTalents(
  state: TalentState,
  heroId: string,
): HeroTalentState {
  return state.heroes[heroId] ?? initialHeroTalentState(heroId);
}

// ── Unlock logic ──────────────────────────────────────────────

/** Check if a node can be unlocked for a hero */
export function canUnlock(
  node: TalentNode,
  heroState: HeroTalentState,
): boolean {
  if (heroState.unlockedNodes.includes(node.id)) return false;
  if (heroState.talentPoints < node.cost) return false;
  // Must have unlocked the previous tier in this branch first
  if (node.tier > 1) {
    const prevNode = TALENT_NODES.find(
      (n) => n.branch === node.branch && n.tier === node.tier - 1,
    );
    if (prevNode && !heroState.unlockedNodes.includes(prevNode.id))
      return false;
  }
  return true;
}

/** Unlock a node — returns updated TalentState or throws */
export function unlockNode(
  state: TalentState,
  heroId: string,
  nodeId: string,
): TalentState {
  const node = NODES_BY_ID[nodeId];
  if (!node) throw new Error(`Unknown talent node: ${nodeId}`);

  const heroState = getHeroTalents(state, heroId);
  if (!canUnlock(node, heroState)) {
    throw new Error(`Cannot unlock node ${nodeId} for hero ${heroId}`);
  }

  return {
    ...state,
    heroes: {
      ...state.heroes,
      [heroId]: {
        ...heroState,
        talentPoints: heroState.talentPoints - node.cost,
        unlockedNodes: [...heroState.unlockedNodes, nodeId],
      },
    },
  };
}

/** Award talent points to a hero (called after dungeon completion) */
export function awardTalentPoints(
  state: TalentState,
  heroId: string,
  points: number,
): TalentState {
  const heroState = getHeroTalents(state, heroId);
  return {
    ...state,
    heroes: {
      ...state.heroes,
      [heroId]: {
        ...heroState,
        talentPoints: heroState.talentPoints + points,
        totalEarned: heroState.totalEarned + points,
      },
    },
  };
}

// ── Bonus calculation ─────────────────────────────────────────

/** Sum all stat bonuses from unlocked nodes for a hero */
export function calcTalentBonuses(
  state: TalentState,
  heroId: string,
): TalentBonuses {
  const heroState = getHeroTalents(state, heroId);
  const bonuses: TalentBonuses = {
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    critPct: 0,
    critDmgPct: 0,
  };
  for (const nodeId of heroState.unlockedNodes) {
    const node = NODES_BY_ID[nodeId];
    if (!node) continue;
    bonuses.atkPct += node.atkPct;
    bonuses.defPct += node.defPct;
    bonuses.hpPct += node.hpPct;
    bonuses.critPct += node.critPct;
    bonuses.critDmgPct += node.critDmgPct;
  }
  return bonuses;
}

/** CP contribution from talent bonuses (simplified estimate) */
export function calcTalentCp(bonuses: TalentBonuses): number {
  return Math.round(
    bonuses.atkPct * 8 +
      bonuses.defPct * 5 +
      bonuses.hpPct * 3 +
      bonuses.critPct * 12 +
      bonuses.critDmgPct * 6,
  );
}
