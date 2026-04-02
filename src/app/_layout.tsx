import { Stack } from 'expo-router';
import { GearProvider } from '../context/GearContext';

export default function RootLayout() {
  return (
    <GearProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GearProvider>
  );
}
