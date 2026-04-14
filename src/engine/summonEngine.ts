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
  characters: Character[];
}

export const SUMMON_BANNERS: SummonBannerConfig[] = [
  {
    id: 'event_1',
    name: 'Event 1',
    pityThreshold: 90,
    pityAThreshold: 10,
    sTierChance: 0.008,
    aTierChance: 0.06,
    characters: [
      { id: '1', name: 'Hero S', rarity: 'S' },
      { id: '2', name: 'Mage A', rarity: 'A' },
      { id: '3', name: 'Warrior B', rarity: 'B' },
    ],
  },
  {
    id: 'event_2',
    name: 'Event 2',
    pityThreshold: 90,
    pityAThreshold: 10,
    sTierChance: 0.01,
    aTierChance: 0.08,
    characters: [
      { id: '4', name: 'Rogue S', rarity: 'S' },
      { id: '5', name: 'Priest A', rarity: 'A' },
      { id: '6', name: 'Knight B', rarity: 'B' },
    ],
  },
];

export function getSummonBannerById(eventId: string): SummonBannerConfig | undefined {
  return SUMMON_BANNERS.find((banner) => banner.id === eventId);
}

function pickRandomCharacter(characters: Character[], rarity: Character['rarity']): Character {
  const pool = characters.filter((character) => character.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
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
    character = pickRandomCharacter(banner.characters, 'S');

    if (!isPity) {
      newPityCount = 0;
      newPityACount = 0;
    }
  } else if (isPityA || roll < banner.aTierChance) {
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
