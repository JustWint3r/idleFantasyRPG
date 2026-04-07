// Pets Page — placeholder
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PetsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Pets</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0E1A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { fontSize: 24, fontWeight: '700', color: '#EDE8FF' },
  sub: { fontSize: 14, color: '#7B7699' },
});
