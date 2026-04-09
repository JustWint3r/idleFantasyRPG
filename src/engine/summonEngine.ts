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

// Configuration
const PITY_THRESHOLD = 100;
const PITY_A_THRESHOLD = 10;
const S_TIER_CHANCE = 0.006; // 0.6%
const A_TIER_CHANCE = 0.06; // 6%

const characters: Character[] = [
  { id: '1', name: 'Hero S', rarity: 'S' },
  { id: '2', name: 'Mage A', rarity: 'A' },
  { id: '3', name: 'Warrior B', rarity: 'B' },
];

function pickRandomCharacter(rarity: Character['rarity']): Character {
  const pool = characters.filter((character) => character.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function performSummon(state: SummonState): { result: SummonResult; newState: SummonState } {
  let newPityCount = state.pityCount + 1;
  let newPityACount = state.pityACount + 1;
  let isPity = false;
  let isPityA = false;

  // Force S-tier on pity
  if (newPityCount >= PITY_THRESHOLD) {
    isPity = true;
    newPityCount = 0;
    newPityACount = 0; // Reset A-tier pity on S-tier pity
  }

  // Force A-tier on pityA
  if (newPityACount >= PITY_A_THRESHOLD) {
    isPityA = true;
    newPityACount = 0;
  }

  // Determine character
  const roll = Math.random();
  let character: Character;

  if (isPity || roll < S_TIER_CHANCE) {
    character = pickRandomCharacter('S');

    if (!isPity) {
      newPityCount = 0; // Reset pity on natural S-tier pull
      newPityACount = 0; // Reset A-tier pity on S-tier pull
    }
  } else if (isPityA || roll < A_TIER_CHANCE) {
    character = pickRandomCharacter('A');

    if (!isPityA) {
      newPityACount = 0; // Reset A-tier pity on natural A-tier pull
    }
  } else {
    character = pickRandomCharacter('B');
  }

  return {
    result: { character, isPity, isPityA },
    newState: { pityCount: newPityCount, pityACount: newPityACount },
  };
};
