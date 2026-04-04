import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { player, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Realm Idle RPG</Text>
      {player && <Text style={styles.playerEmail}>{player.email}</Text>}

      <View style={styles.statsRow}>
        <StatBox label="Gold" value={player?.gold ?? 0} color="#F5C542" />
        <StatBox label="Diamonds" value={player?.diamonds ?? 0} color="#5CF5FF" />
        <StatBox label="Scrolls" value={player?.summonScrolls ?? 0} color="#BF7CFF" />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#EDE8FF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  playerEmail: {
    color: '#9B96B8',
    fontSize: 14,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  statBox: {
    backgroundColor: '#1C1A2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: '#2D2A45',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#9B96B8',
    fontSize: 12,
    marginTop: 4,
  },
  logoutBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3A55',
  },
  logoutText: {
    color: '#9B96B8',
    fontSize: 14,
  },
});
