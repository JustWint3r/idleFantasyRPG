// ─────────────────────────────────────────────────────────────
//  heroRoster.data.ts
//  Static hero definitions. Add new heroes here.
// ─────────────────────────────────────────────────────────────

import type { HeroTemplate } from '../types/hero.types';

export const HERO_ROSTER: HeroTemplate[] = [
  {
    id: 'hero_001',
    name: 'Aria the Swift',
    class: 'warrior',
    image: require('../../assets/aria.png'),
  },
  {
    id: 'hero_002',
    name: 'Kael the Dark',
    class: 'mage',
    image: require('../../assets/aria.png'), // placeholder until Kael asset is added
  },
  {
    id: 'hero_003',
    name: 'Selene the Sage',
    class: 'support',
    image: require('../../assets/selene.png'),
    /** Animated GIF (transparent background) played while attacking */
    attackVideo: require('../../assets/seleneNormalAtk.gif'),
  },
];
