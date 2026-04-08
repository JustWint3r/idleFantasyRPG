// ─────────────────────────────────────────────────────────────
//  PetScreen.tsx
//  Flow orchestrator for the entire pet system.
//  Manages scene transitions:
//    home → spawn → fight → catch → home
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import type { WildPetInstance } from '../types/petCollection.types';
import PetHomeScreen     from './PetHomeScreen';
import PetSpawnScreen    from './PetSpawnScreen';
import PetFightingScreen from './PetFightingScreen';
import PetCatchingScreen from './PetCatchingScreen';

// ── Scene state machine ───────────────────────────────────────

type Scene =
  | { type: 'home' }
  | { type: 'spawn' }
  | { type: 'fight'; wildPet: WildPetInstance }
  | { type: 'catch'; wildPet: WildPetInstance; performance: number };

// ── Orchestrator ──────────────────────────────────────────────

export default function PetScreen() {
  const [scene, setScene] = useState<Scene>({ type: 'home' });

  if (scene.type === 'home') {
    return (
      <PetHomeScreen
        onCatch={() => setScene({ type: 'spawn' })}
      />
    );
  }

  if (scene.type === 'spawn') {
    return (
      <PetSpawnScreen
        onSelectPet={(wildPet) => setScene({ type: 'fight', wildPet })}
        onBack={() => setScene({ type: 'home' })}
      />
    );
  }

  if (scene.type === 'fight') {
    return (
      <PetFightingScreen
        wildPet={scene.wildPet}
        onWin={(performance) =>
          setScene({ type: 'catch', wildPet: scene.wildPet, performance })
        }
        onLose={() => setScene({ type: 'home' })}
        onBack={() => setScene({ type: 'spawn' })}
      />
    );
  }

  // scene.type === 'catch'
  return (
    <PetCatchingScreen
      wildPet={scene.wildPet}
      performance={scene.performance}
      onDone={() => setScene({ type: 'home' })}
    />
  );
}
