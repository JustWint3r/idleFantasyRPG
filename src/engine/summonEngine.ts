export interface Character {
  id: string;
  name: string;
  rarity: 'S' | 'A' | 'B';
}

export interface SummonResult {
  character: Character;
  isPity: boolean;
  isPityA: boolean;
}

export interface SummonState {
  pityCount: number;
  pityACount: number;
}

export interface SummonBannerConfig {
  id: string;
  name: string;
  pityThreshold: number;
  pityAThreshold: number;
  sTierChance: number;
  aTierChance: number;
  featuredSCharacterId: string;
  featuredSRate: number;
  characters: Character[];
}

const HERO_POOL: Character[] = [
  { id: 's1', name: 'Aurelius', rarity: 'S' },
  { id: 's2', name: 'Nyx', rarity: 'S' },
  { id: 's3', name: 'Kael', rarity: 'S' },
  { id: 's4', name: 'Seraphine', rarity: 'S' },
  { id: 'a1', name: 'Luna', rarity: 'A' },
  { id: 'a2', name: 'Ronan', rarity: 'A' },
  { id: 'a3', name: 'Mira', rarity: 'A' },
  { id: 'b1', name: 'Garrick', rarity: 'B' },
  { id: 'b2', name: 'Faye', rarity: 'B' },
  { id: 'b3', name: 'Thorn', rarity: 'B' },
];

export const SUMMON_BANNERS: SummonBannerConfig[] = [
  {
    id: 'event_1',
    name: 'Event 1',
    pityThreshold: 90,
    pityAThreshold: 10,
    sTierChance: 0.008,
    aTierChance: 0.06,
    featuredSCharacterId: 's1',
    featuredSRate: 0.5,
    characters: HERO_POOL,
  },
  {
    id: 'event_2',
    name: 'Event 2',
    pityThreshold: 90,
    pityAThreshold: 10,
    sTierChance: 0.01,
    aTierChance: 0.08,
    featuredSCharacterId: 's2',
    featuredSRate: 0.5,
    characters: HERO_POOL,
  },
];

export function getSummonBannerById(eventId: string): SummonBannerConfig | undefined {
  return SUMMON_BANNERS.find((banner) => banner.id === eventId);
}

function pickRandomCharacter(characters: Character[], rarity: Character['rarity']): Character {
  const pool = characters.filter((character) => character.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickSCharacterWithFeatured5050(banner: SummonBannerConfig): Character {
  const sPool = banner.characters.filter((character) => character.rarity === 'S');
  const featured = sPool.find((character) => character.id === banner.featuredSCharacterId);

  if (!featured) {
    return pickRandomCharacter(banner.characters, 'S');
  }

  const offBannerSPool = sPool.filter((character) => character.id !== featured.id);
  if (offBannerSPool.length === 0) {
    return featured;
  }

  const isFeaturedWin = Math.random() < banner.featuredSRate;
  return isFeaturedWin ? featured : offBannerSPool[Math.floor(Math.random() * offBannerSPool.length)];
}

export function performSummon(
  state: SummonState,
  banner: SummonBannerConfig = SUMMON_BANNERS[0],
): { result: SummonResult; newState: SummonState } {
  let newPityCount = state.pityCount + 1;
  let newPityACount = state.pityACount + 1;
  let isPity = false;
  let isPityA = false;

  if (newPityCount >= banner.pityThreshold) {
    isPity = true;
    newPityCount = 0;
    newPityACount = 0;
  }

  if (newPityACount >= banner.pityAThreshold) {
    isPityA = true;
    newPityACount = 0;
  }

  const roll = Math.random();
  let character: Character;

  if (isPity || roll < banner.sTierChance) {
    character = pickSCharacterWithFeatured5050(banner);

    // Any S-tier outcome resets pity, whether it is the featured win or the off-banner loss.
    if (!isPity) {
      newPityCount = 0;
      newPityACount = 0;
    }
  } else if (isPityA || roll < banner.aTierChance) {
    // Any A-tier outcome resets A pity.
    character = pickRandomCharacter(banner.characters, 'A');

    if (!isPityA) {
      newPityACount = 0;
    }
  } else {
    character = pickRandomCharacter(banner.characters, 'B');
  }

  return {
    result: { character, isPity, isPityA },
    newState: { pityCount: newPityCount, pityACount: newPityACount },
  };
};
