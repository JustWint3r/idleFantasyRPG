// ─────────────────────────────────────────────────────────────
//  talent.types.ts
// ─────────────────────────────────────────────────────────────

export type TalentBranch = 'atk' | 'def' | 'hp' | 'utility';

export interface TalentNode {
  id: string; // e.g. 'atk_1'
  branch: TalentBranch;
  tier: number; // 1-5
  name: string;
  description: string;
  cost: number; // talent points required
  /** Stat bonuses granted when this node is unlocked (% multipliers) */
  atkPct: number;
  defPct: number;
  hpPct: number;
  critPct: number; // flat % added to crit chance
  critDmgPct: number; // flat % added to crit dmg
}

export interface HeroTalentState {
  heroId: string;
  talentPoints: number; // available to spend
  totalEarned: number; // lifetime points earned
  unlockedNodes: string[]; // node ids unlocked
}

export interface TalentState {
  heroes: Record<string, HeroTalentState>;
}

/** Aggregated bonuses from all unlocked nodes */
export interface TalentBonuses {
  atkPct: number;
  defPct: number;
  hpPct: number;
  critPct: number;
  critDmgPct: number;
}

export const BRANCH_COLORS: Record<TalentBranch, string> = {
  atk: '#F87171', // red
  def: '#60A5FA', // blue
  hp: '#4ADE80', // green
  utility: '#A78BFA', // purple
};

export const BRANCH_LABELS: Record<TalentBranch, string> = {
  atk: 'ATK',
  def: 'DEF',
  hp: 'HP',
  utility: 'Utility',
};
