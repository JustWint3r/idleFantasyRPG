import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';
import { TalentProvider } from '../context/TalentContext';
import { AuthProvider } from '../context/AuthContext';
import { PetCollectionProvider } from '../context/PetCollectionContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <GearProvider>
          <TalentProvider>
            <PetCollectionProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </PetCollectionProvider>
          </TalentProvider>
        </GearProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}
