// ─────────────────────────────────────────────────────────────
//  PetSpawnScreen.tsx
//  Zone selection map → spawns 3 random wild pets to choose from.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { spawnWildPets } from '../engine/petBattleEngine';
import {
  RARITY_COLOR,
  RARITY_LABEL,
  ZONE_BG,
  ZONE_EMOJI,
  ZONE_LABEL,
  type PetZone,
  type WildPetInstance,
} from '../types/petCollection.types';

const ZONES: PetZone[] = ['rain_forest', 'sea', 'endless_fire'];

const C = {
  bg:          '#0F0E1A',
  surface:     '#1A1830',
  surfaceHigh: '#242140',
  border:      '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted:   '#7B7699',
  gold:        '#F5C842',
} as const;

// ── Wild pet card ─────────────────────────────────────────────

function WildPetCard({
  wild,
  onFight,
}: {
  wild: WildPetInstance;
  onFight: () => void;
}) {
  const color = RARITY_COLOR[wild.template.rarity];
  return (
    <View style={[styles.wildCard, { borderColor: color }]}>
      <Text style={styles.wildEmoji}>{wild.template.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.wildName, { color }]}>{wild.template.name}</Text>
        <Text style={styles.wildRarity}>{RARITY_LABEL[wild.template.rarity]}</Text>
        <View style={styles.wildStats}>
          <Text style={styles.wildStat}>HP {wild.maxHp}</Text>
          <Text style={styles.wildStat}>ATK {wild.atk}</Text>
          <Text style={styles.wildStat}>SPD {wild.spd}</Text>
        </View>
        <Text style={styles.wildDesc} numberOfLines={2}>{wild.template.description}</Text>
      </View>
      <Pressable style={[styles.fightBtn, { borderColor: color }]} onPress={onFight}>
        <Text style={[styles.fightBtnText, { color }]}>Fight!</Text>
      </Pressable>
    </View>
  );
}

// ── Zone map card ─────────────────────────────────────────────

function ZoneCard({
  zone,
  onSelect,
}: {
  zone: PetZone;
  onSelect: () => void;
}) {
  return (
    <Pressable
      style={[styles.zoneCard, { backgroundColor: ZONE_BG[zone] }]}
      onPress={onSelect}
    >
      <Text style={styles.zoneEmoji}>{ZONE_EMOJI[zone]}</Text>
      <Text style={styles.zoneName}>{ZONE_LABEL[zone]}</Text>
      <Text style={styles.zoneHint}>Tap to explore</Text>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function PetSpawnScreen({
  onSelectPet,
  onBack,
}: {
  onSelectPet: (wild: WildPetInstance) => void;
  onBack: () => void;
}) {
  const [wildPets, setWildPets] = useState<WildPetInstance[] | null>(null);
  const [selectedZone, setSelectedZone] = useState<PetZone | null>(null);

  function handleZone(zone: PetZone) {
    setSelectedZone(zone);
    setWildPets(spawnWildPets(zone));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Back */}
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      {!wildPets ? (
        <>
          <Text style={styles.heading}>Choose a Zone</Text>
          <Text style={styles.sub}>3 wild pets will appear — pick one to fight!</Text>
          <View style={styles.zonesGrid}>
            {ZONES.map((z) => (
              <ZoneCard key={z} zone={z} onSelect={() => handleZone(z)} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.heading}>
            {ZONE_EMOJI[selectedZone!]} {ZONE_LABEL[selectedZone!]}
          </Text>
          <Text style={styles.sub}>3 wild pets appeared — choose one to battle!</Text>
          {wildPets.map((w, i) => (
            <WildPetCard
              key={i}
              wild={w}
              onFight={() => onSelectPet(w)}
            />
          ))}
          <Pressable
            style={styles.rerollBtn}
            onPress={() => setWildPets(spawnWildPets(selectedZone!))}
          >
            <Text style={styles.rerollText}>🔄 Re-explore zone</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  backBtn:  { flexDirection: 'row', alignItems: 'center' },
  backText: { color: C.textMuted, fontSize: 14 },

  heading: { color: C.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub:     { color: C.textMuted,   fontSize: 13, textAlign: 'center' },

  zonesGrid: { gap: 12 },
  zoneCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  zoneEmoji: { fontSize: 52 },
  zoneName:  { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  zoneHint:  { fontSize: 12, color: C.textMuted },

  wildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 2,
  },
  wildEmoji:  { fontSize: 40 },
  wildName:   { fontSize: 15, fontWeight: '700' },
  wildRarity: { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  wildStats:  { flexDirection: 'row', gap: 8, marginBottom: 4 },
  wildStat:   { fontSize: 11, color: C.textMuted, backgroundColor: C.surfaceHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  wildDesc:   { fontSize: 11, color: C.textMuted, lineHeight: 16 },

  fightBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  fightBtnText: { fontSize: 13, fontWeight: '700' },

  rerollBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  rerollText: { color: C.textMuted, fontSize: 14 },
});
