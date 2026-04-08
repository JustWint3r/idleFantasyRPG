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
  activePetId: string | null;
  isLoaded: boolean;
  setActivePet: (id: string) => void;
  addPet: (pet: OwnedPet) => void;
  upgradePet: (id: string, expGain: number) => void;
  removePet: (id: string) => void;
}

const PetCollectionContext = createContext<PetCollectionContextValue | null>(null);

interface StoredState {
  ownedPets: OwnedPet[];
  activePetId: string | null;
}

async function loadState(): Promise<StoredState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredState;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Load / initialise ───────────────────────────────────────
  useEffect(() => {
    loadState().then((stored) => {
      if (stored && stored.ownedPets.length > 0) {
        setOwnedPets(stored.ownedPets);
        setActivePetIdState(stored.activePetId ?? stored.ownedPets[0].id);
      } else {
        // First launch — give starter pet
        const starter = createStarterPet();
        setOwnedPets([starter]);
        setActivePetIdState(starter.id);
        saveState({ ownedPets: [starter], activePetId: starter.id });
      }
      setIsLoaded(true);
    });
  }, []);

  // ── Helpers ─────────────────────────────────────────────────
  function persist(pets: OwnedPet[], activeId: string | null) {
    saveState({ ownedPets: pets, activePetId: activeId });
  }

  const setActivePet = useCallback((id: string) => {
    setActivePetIdState(id);
    setOwnedPets((prev) => {
      persist(prev, id);
      return prev;
    });
  }, []);

  const addPet = useCallback((pet: OwnedPet) => {
    setOwnedPets((prev) => {
      const next = [...prev, pet];
      persist(next, activePetId);
      return next;
    });
  }, [activePetId]);

  const upgradePet = useCallback((id: string, expGain: number) => {
    setOwnedPets((prev) => {
      const next = prev.map((p) => p.id === id ? feedPet(p, expGain) : p);
      persist(next, activePetId);
      return next;
    });
  }, [activePetId]);

  const removePet = useCallback((id: string) => {
    setOwnedPets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const newActiveId = activePetId === id ? (next[0]?.id ?? null) : activePetId;
      setActivePetIdState(newActiveId);
      persist(next, newActiveId);
      return next;
    });
  }, [activePetId]);

  return (
    <PetCollectionContext.Provider
      value={{ ownedPets, activePetId, isLoaded, setActivePet, addPet, upgradePet, removePet }}
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
