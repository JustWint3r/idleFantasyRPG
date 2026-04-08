// ─────────────────────────────────────────────────────────────
//  PetCollectionContext.tsx
//  Manages owned pets, active pet selection, feeding/upgrading.
//  Auto-assigns a starter pet for new players.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OwnedPet } from '../types/petCollection.types';
import { createStarterPet, feedPet } from '../engine/petBattleEngine';

const STORAGE_KEY = '@realm_idle/pet_collection_v1';

interface PetCollectionContextValue {
  ownedPets: OwnedPet[];
  /** Pet shown/used in the Pet battle page */
  activePetId: string | null;
  /** Per-hero equipped pet: heroId → petId */
  heroPets: Record<string, string>;
  isLoaded: boolean;
  setActivePet: (id: string) => void;
  /** Equip a pet to a specific hero (replaces any previously equipped pet) */
  equipPetToHero: (heroId: string, petId: string) => void;
  /** Unequip the pet from a specific hero */
  unequipPetFromHero: (heroId: string) => void;
  addPet: (pet: OwnedPet) => void;
  upgradePet: (id: string, expGain: number) => void;
  removePet: (id: string) => void;
}

const PetCollectionContext = createContext<PetCollectionContextValue | null>(null);

interface StoredState {
  ownedPets: OwnedPet[];
  activePetId: string | null;
  heroPets: Record<string, string>;
}

async function loadState(): Promise<StoredState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return { heroPets: {}, ...parsed };
  } catch {
    return null;
  }
}

async function saveState(state: StoredState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[PetCollectionContext] save failed', e);
  }
}

export function PetCollectionProvider({ children }: { children: React.ReactNode }) {
  const [ownedPets, setOwnedPets] = useState<OwnedPet[]>([]);
  const [activePetId, setActivePetIdState] = useState<string | null>(null);
  const [heroPets, setHeroPets] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Load / initialise ───────────────────────────────────────
  useEffect(() => {
    loadState().then((stored) => {
      if (stored && stored.ownedPets.length > 0) {
        setOwnedPets(stored.ownedPets);
        setActivePetIdState(stored.activePetId ?? stored.ownedPets[0].id);
        setHeroPets(stored.heroPets ?? {});
      } else {
        // First launch — give starter pet
        const starter = createStarterPet();
        setOwnedPets([starter]);
        setActivePetIdState(starter.id);
        saveState({ ownedPets: [starter], activePetId: starter.id, heroPets: {} });
      }
      setIsLoaded(true);
    });
  }, []);

  // ── Helpers ─────────────────────────────────────────────────
  function persist(pets: OwnedPet[], activeId: string | null, hp: Record<string, string>) {
    saveState({ ownedPets: pets, activePetId: activeId, heroPets: hp });
  }

  const setActivePet = useCallback((id: string) => {
    setActivePetIdState(id);
    setOwnedPets((prev) => {
      setHeroPets((hp) => { persist(prev, id, hp); return hp; });
      return prev;
    });
  }, []);

  const equipPetToHero = useCallback((heroId: string, petId: string) => {
    setHeroPets((prev) => {
      const next = { ...prev, [heroId]: petId };
      setOwnedPets((pets) => { persist(pets, null, next); return pets; });
      return next;
    });
    // Keep activePetId in sync so Pet page shows same pet
    setActivePetIdState(petId);
  }, []);

  const unequipPetFromHero = useCallback((heroId: string) => {
    setHeroPets((prev) => {
      const next = { ...prev };
      delete next[heroId];
      setOwnedPets((pets) => { persist(pets, null, next); return pets; });
      return next;
    });
  }, []);

  const addPet = useCallback((pet: OwnedPet) => {
    setOwnedPets((prev) => {
      const next = [...prev, pet];
      setHeroPets((hp) => { persist(next, null, hp); return hp; });
      return next;
    });
  }, []);

  const upgradePet = useCallback((id: string, expGain: number) => {
    setOwnedPets((prev) => {
      const next = prev.map((p) => p.id === id ? feedPet(p, expGain) : p);
      setHeroPets((hp) => { persist(next, null, hp); return hp; });
      return next;
    });
  }, []);

  const removePet = useCallback((id: string) => {
    setOwnedPets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const newActiveId = activePetId === id ? (next[0]?.id ?? null) : activePetId;
      setActivePetIdState(newActiveId);
      setHeroPets((hp) => {
        // Remove this pet from any hero that had it equipped
        const cleaned = Object.fromEntries(
          Object.entries(hp).filter(([, v]) => v !== id)
        );
        persist(next, newActiveId, cleaned);
        return cleaned;
      });
      return next;
    });
  }, [activePetId]);

  return (
    <PetCollectionContext.Provider
      value={{
        ownedPets,
        activePetId,
        heroPets,
        isLoaded,
        setActivePet,
        equipPetToHero,
        unequipPetFromHero,
        addPet,
        upgradePet,
        removePet,
      }}
    >
      {children}
    </PetCollectionContext.Provider>
  );
}

export function usePetCollection() {
  const ctx = useContext(PetCollectionContext);
  if (!ctx) throw new Error('usePetCollection must be inside PetCollectionProvider');
  return ctx;
}
