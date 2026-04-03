import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';

export default function RootLayout() {
  return (
    <PlayerProvider>
      <GearProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GearProvider>
    </PlayerProvider>
  );
}
