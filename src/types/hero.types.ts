// ─────────────────────────────────────────────────────────────
//  hero.types.ts
//  Hero roster types — level, exp, stars, identity.
// ─────────────────────────────────────────────────────────────

export type HeroClass = 'warrior' | 'ranger' | 'mage' | 'support';

export interface HeroTemplate {
  id: string;
  name: string;
  class: HeroClass;
  image: ReturnType<typeof require>;
  /** Optional video played during attack animation in the farm scene */
  attackVideo?: ReturnType<typeof require>;
}

export interface HeroState {
  id: string;        // matches HeroTemplate.id
  level: number;     // 1–100
  exp: number;       // current exp within this level
  stars: number;     // 0–6
}

/** How much EXP is needed to reach the next level */
export function expToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.18, level - 1));
}

/** XP Books consumed per level-up attempt. 1 book = 100 EXP */
export const XP_PER_BOOK = 100;

/** Stars: 0–5 = standard; 6 = super. Material costs to star up. */
export const STAR_UP_GOLD: Record<number, number> = {
  0: 500,
  1: 1_500,
  2: 4_000,
  3: 10_000,
  4: 25_000,
  5: 60_000,
};

/** Max star = 6 */
export const MAX_STARS = 6;
/** Max level */
export const MAX_LEVEL = 100;
