import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="farm" options={{ title: 'Farm' }} />
      <Tabs.Screen name="gear" options={{ title: 'Gear' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="talent" options={{ title: 'Talents' }} />
    </Tabs>
  );
}
