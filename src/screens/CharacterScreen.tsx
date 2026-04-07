// ─────────────────────────────────────────────────────────────
//  CharacterScreen.tsx
//  Container screen for the Character page with sub-tab
//  navigation: Gear | Inventory | Talent
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GearScreen from './GearScreen';
import InventoryScreen from './InventoryScreen';
import TalentScreen from './TalentScreen';

type SubTab = 'gear' | 'inventory' | 'talent';

const C = {
  bg: '#0F0E1A',
  surface: '#1A1830',
  border: '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted: '#7B7699',
  gold: '#F5C842',
} as const;

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'gear', label: 'Gear' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'talent', label: 'Talent' },
];

export default function CharacterScreen() {
  const [active, setActive] = useState<SubTab>('gear');

  return (
    <View style={styles.screen}>
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {SUB_TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.subTab, active === t.key && styles.subTabActive]}
            onPress={() => setActive(t.key)}
          >
            <Text
              style={[
                styles.subTabText,
                active === t.key && styles.subTabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Active sub-screen */}
      <View style={styles.content}>
        {active === 'gear' && <GearScreen />}
        {active === 'inventory' && <InventoryScreen />}
        {active === 'talent' && <TalentScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: C.gold },
  subTabText: { fontSize: 13, color: C.textMuted },
  subTabTextActive: { color: C.gold, fontWeight: '600' },
  content: { flex: 1 },
});
