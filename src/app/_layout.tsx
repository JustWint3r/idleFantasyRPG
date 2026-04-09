import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';
import { TalentProvider } from '../context/TalentContext';
import { AuthProvider } from '../context/AuthContext';
import { PetCollectionProvider } from '../context/PetCollectionContext';
import { HeroCollectionProvider } from '../context/HeroCollectionContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <GearProvider>
          <TalentProvider>
            <PetCollectionProvider>
              <HeroCollectionProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </HeroCollectionProvider>
            </PetCollectionProvider>
          </TalentProvider>
        </GearProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}
