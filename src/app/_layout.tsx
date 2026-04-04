import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';
import { TalentProvider } from '../context/TalentContext';

export default function RootLayout() {
  return (
    <PlayerProvider>
      <GearProvider>
        <TalentProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </TalentProvider>
      </GearProvider>
    </PlayerProvider>
  );
}
