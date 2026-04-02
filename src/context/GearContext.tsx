import React, { createContext, useContext } from 'react';
import { useGearState, UseGearStateReturn } from '../hooks/useGearState';

const GearContext = createContext<UseGearStateReturn | null>(null);

export function GearProvider({ children }: { children: React.ReactNode }) {
  const gear = useGearState();
  return <GearContext.Provider value={gear}>{children}</GearContext.Provider>;
}

export function useGear(): UseGearStateReturn {
  const ctx = useContext(GearContext);
  if (!ctx) throw new Error('useGear must be used inside GearProvider');
  return ctx;
}
