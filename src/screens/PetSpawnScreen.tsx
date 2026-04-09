// ─────────────────────────────────────────────────────────────
//  PetSpawnScreen.tsx
//  Map view — one wild pet spawns per zone; player picks one to fight.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { spawnOneWildPet } from '../engine/petBattleEngine';
import {
  RAINBOW_CYCLE,
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
  mapBorder:   '#3A3560',
} as const;

// ── Rainbow hook ──────────────────────────────────────────────

function useRainbowColor(active: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  return anim.interpolate({
    inputRange:  RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });
}

// ── Zone map tile ─────────────────────────────────────────────

function ZoneTile({
  zone,
  pet,
  onFight,
}: {
  zone: PetZone;
  pet: WildPetInstance;
  onFight: () => void;
}) {
  const isSuper   = pet.template.rarity === 'super_legendary';
  const baseColor = RARITY_COLOR[pet.template.rarity];
  const rainbow   = useRainbowColor(isSuper);
  const color     = isSuper ? rainbow : baseColor;

  return (
    <View style={[styles.zoneTile, { backgroundColor: ZONE_BG[zone] }]}>
      {/* Zone header */}
      <View style={styles.zoneHeader}>
        <Text style={styles.zoneEmoji}>{ZONE_EMOJI[zone]}</Text>
        <Text style={styles.zoneName}>{ZONE_LABEL[zone]}</Text>
      </View>

      {/* Divider */}
      <View style={[styles.zoneDivider, { backgroundColor: C.mapBorder }]} />

      {/* Spawned pet */}
      <Animated.View style={[styles.petCard, { borderColor: color }]}>
        <View style={styles.petArt}>
          {pet.template.image
            ? <Image source={pet.template.image} style={styles.petImage} />
            : <Text style={styles.petEmoji}>{pet.template.emoji}</Text>
          }
        </View>

        <View style={styles.petInfo}>
          <Animated.Text style={[styles.petName, { color }]} numberOfLines={1}>
            {pet.template.name}
          </Animated.Text>
          <Text style={styles.petRarity}>{RARITY_LABEL[pet.template.rarity]}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>HP {pet.maxHp}</Text>
            <Text style={styles.stat}>ATK {pet.atk}</Text>
            <Text style={styles.stat}>SPD {pet.spd}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Fight button */}
      <Animated.View style={[styles.fightBtnWrap, { borderColor: color }]}>
        <Pressable style={styles.fightBtnInner} onPress={onFight}>
          <Animated.Text style={[styles.fightBtnText, { color }]}>
            ⚔️ Fight &amp; Catch
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

type ZoneMap = Record<PetZone, WildPetInstance>;

function spawnAll(): ZoneMap {
  return {
    rain_forest:    spawnOneWildPet('rain_forest'),
    sea:            spawnOneWildPet('sea'),
    endless_fire:   spawnOneWildPet('endless_fire'),
  };
}

export default function PetSpawnScreen({
  onSelectPet,
  onBack,
}: {
  onSelectPet: (wild: WildPetInstance) => void;
  onBack: () => void;
}) {
  const [zoneMap, setZoneMap] = useState<ZoneMap>(spawnAll);

  const reroll = useCallback(() => setZoneMap(spawnAll()), []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header */}
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.heading}>Wild Encounters</Text>
      <Text style={styles.sub}>
        One pet has appeared in each zone — choose one to fight and catch!
      </Text>

      {/* Map container */}
      <View style={styles.mapContainer}>
        {/* Decorative map label */}
        <Text style={styles.mapLabel}>🗺️ World Map</Text>

        {/* Rain Forest — top */}
        <ZoneTile
          zone="rain_forest"
          pet={zoneMap.rain_forest}
          onFight={() => onSelectPet(zoneMap.rain_forest)}
        />

        {/* Horizontal path divider */}
        <View style={styles.pathDivider}>
          <View style={styles.pathLine} />
          <Text style={styles.pathDot}>≈</Text>
          <View style={styles.pathLine} />
        </View>

        {/* Sea — middle */}
        <ZoneTile
          zone="sea"
          pet={zoneMap.sea}
          onFight={() => onSelectPet(zoneMap.sea)}
        />

        {/* Horizontal path divider */}
        <View style={styles.pathDivider}>
          <View style={styles.pathLine} />
          <Text style={styles.pathDot}>≈</Text>
          <View style={styles.pathLine} />
        </View>

        {/* Endless Fire — bottom */}
        <ZoneTile
          zone="endless_fire"
          pet={zoneMap.endless_fire}
          onFight={() => onSelectPet(zoneMap.endless_fire)}
        />
      </View>

      {/* Re-roll */}
      <Pressable style={styles.rerollBtn} onPress={reroll}>
        <Text style={styles.rerollText}>🔄 Respawn all pets</Text>
      </Pressable>

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  backBtn:  { flexDirection: 'row', alignItems: 'center' },
  backText: { color: C.textMuted, fontSize: 14 },

  heading: { color: C.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub:     { color: C.textMuted,   fontSize: 13, textAlign: 'center' },

  // Map wrapper
  mapContainer: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.mapBorder,
    padding: 12,
    gap: 0,
  },
  mapLabel: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Zone tile
  zoneTile: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: C.mapBorder,
    overflow: 'hidden',
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneEmoji:  { fontSize: 24 },
  zoneName:   { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  zoneDivider:{ height: 1, borderRadius: 1, opacity: 0.4 },

  // Pet card inside tile
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1.5,
  },
  petArt:   { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  petImage: { width: 52, height: 52, resizeMode: 'contain' },
  petEmoji: { fontSize: 38 },
  petInfo:  { flex: 1, gap: 2 },
  petName:  { fontSize: 14, fontWeight: '700' },
  petRarity:{ fontSize: 11, color: C.textMuted },
  statsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  stat:     {
    fontSize: 10,
    color: C.textMuted,
    backgroundColor: C.bg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },

  // Fight button
  fightBtnWrap: {
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  fightBtnInner: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  fightBtnText: { fontSize: 14, fontWeight: '700' },

  // Path divider between zones
  pathDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 6,
  },
  pathLine: { flex: 1, height: 1, backgroundColor: C.mapBorder },
  pathDot:  { color: C.textMuted, fontSize: 14 },

  // Re-roll
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
