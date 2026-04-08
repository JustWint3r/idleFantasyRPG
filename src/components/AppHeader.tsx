// ─────────────────────────────────────────────────────────────
//  AppHeader.tsx
//  Shared header shown on every tab:
//  • Horizontally scrollable currency chips
//  • Settings button → modal with Logout + placeholder settings
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { CURRENCY_META } from '../types/player.types';

// ── Colours ───────────────────────────────────────────────────

const C = {
  bg: '#0F0E1A',
  surface: '#1A1830',
  surfaceHigh: '#242140',
  border: '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted: '#7B7699',
  gold: '#F5C842',
  red: '#F87171',
} as const;

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}

// ── Settings modal ────────────────────────────────────────────

function SettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { logout } = useAuth();
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [notifOn, setNotifOn] = useState(false);

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.settingsCard} onPress={() => {}}>
          <Text style={styles.settingsTitle}>Settings</Text>

          {/* Toggles */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>🔊 Sound Effects</Text>
            <Switch
              value={soundOn}
              onValueChange={setSoundOn}
              trackColor={{ true: C.gold }}
              thumbColor={C.textPrimary}
            />
          </View>

          <View style={[styles.settingRow, styles.settingBorder]}>
            <Text style={styles.settingLabel}>🎵 Background Music</Text>
            <Switch
              value={musicOn}
              onValueChange={setMusicOn}
              trackColor={{ true: C.gold }}
              thumbColor={C.textPrimary}
            />
          </View>

          <View style={[styles.settingRow, styles.settingBorder]}>
            <Text style={styles.settingLabel}>🔔 Notifications</Text>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ true: C.gold }}
              thumbColor={C.textPrimary}
            />
          </View>

          {/* Logout */}
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── App header ────────────────────────────────────────────────

export default function AppHeader() {
  const { currencies } = usePlayer();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <View style={styles.header}>
        {/* Currency bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.currScroll}
          contentContainerStyle={styles.currContent}
        >
          {CURRENCY_META.map((m) => (
            <View key={m.key} style={styles.currChip}>
              <Text style={styles.currIcon}>{m.icon}</Text>
              <Text style={[styles.currVal, { color: m.color }]}>
                {fmt(currencies[m.key])}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Settings button */}
        <Pressable
          style={styles.settingsBtn}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 24;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  currScroll: { flex: 1 },
  currContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  currChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  currIcon: { fontSize: 12 },
  currVal: { fontSize: 12, fontWeight: '600' },

  settingsBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: 19,
    borderWidth: 0.5,
    borderColor: C.border,
    marginLeft: 8,
  },
  settingsIcon: { fontSize: 18 },

  // Settings modal
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  settingsCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  settingsTitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingBorder: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  settingLabel: {
    color: C.textPrimary,
    fontSize: 15,
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: '#3D1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.red,
  },
  logoutText: {
    color: C.red,
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  closeBtnText: {
    color: C.textMuted,
    fontSize: 14,
  },
});
