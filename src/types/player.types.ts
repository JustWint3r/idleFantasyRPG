// ─────────────────────────────────────────────────────────────
//  player.types.ts
//  Player-level currencies and inventory consumables.
// ─────────────────────────────────────────────────────────────

export interface PlayerCurrencies {
  gold: number;
  diamonds: number; // premium currency
  summonScrolls: number;
  upgradeScrolls: number;
  craftMats: number;
  xpBooks: number;
  stone10: number; // +10% support stone
  stone20: number; // +20% support stone
  stone30: number; // +30% support stone
}

export function initialCurrencies(): PlayerCurrencies {
  return {
    gold: 5000,
    diamonds: 300,
    summonScrolls: 5,
    upgradeScrolls: 10,
    craftMats: 30,
    xpBooks: 20,
    stone10: 3,
    stone20: 1,
    stone30: 0,
  };
}

export interface CurrencyDisplay {
  key: keyof PlayerCurrencies;
  label: string;
  icon: string;
  color: string;
}

export const CURRENCY_META: CurrencyDisplay[] = [
  { key: 'gold', label: 'Gold', icon: '🪙', color: '#F5C842' },
  { key: 'diamonds', label: 'Diamonds', icon: '💎', color: '#60A5FA' },
  { key: 'summonScrolls', label: 'Scrolls', icon: '📜', color: '#A78BFA' },
  { key: 'upgradeScrolls', label: 'Upg. Scroll', icon: '📋', color: '#34D399' },
  { key: 'craftMats', label: 'Mats', icon: '⚙️', color: '#FB923C' },
  { key: 'xpBooks', label: 'XP Books', icon: '📖', color: '#60A5FA' },
  { key: 'stone10', label: '+10% Stone', icon: '🔮', color: '#C4B5FD' },
  { key: 'stone20', label: '+20% Stone', icon: '🔮', color: '#8B5CF6' },
  { key: 'stone30', label: '+30% Stone', icon: '🔮', color: '#6D28D9' },
];
