import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';
import { PlayerProvider } from '../context/PlayerContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <GearProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </GearProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}
