import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';
import { TalentProvider } from '../context/TalentContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <GearProvider>
          <TalentProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </TalentProvider>
        </GearProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}
