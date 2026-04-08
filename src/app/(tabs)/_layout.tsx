import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import AppHeader from '../../components/AppHeader';

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <AppHeader />
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="summon" options={{ title: 'Summon' }} />
        <Tabs.Screen name="character" options={{ title: 'Character' }} />
        <Tabs.Screen name="farm" options={{ title: 'Farm' }} />
        <Tabs.Screen name="pets" options={{ title: 'Pets' }} />
        <Tabs.Screen name="store" options={{ title: 'Store' }} />
        <Tabs.Screen name="home" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0E1A' },
});
