// ─────────────────────────────────────────────────────────────
//  PetSpawnScreen.tsx
//  Full-screen world map — no scrolling.
//  Particle FX: fire sparks (volcano zone) + falling leaves (forest zone).
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { spawnOneWildPet } from '../engine/petBattleEngine';
import {
  RAINBOW_CYCLE,
  RARITY_COLOR,
  RARITY_LABEL,
  type PetZone,
  type WildPetInstance,
} from '../types/petCollection.types';

// ── Map dimensions ─────────────────────────────────────────────
// The map fills the full screen width at the image's exact aspect ratio.
// This avoids any upscaling or cropping — the whole image is always visible.
const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W;
const MAP_H = Math.round(MAP_W * (1376 / 768)); // exact petMap.png ratio → ~699px on 390px phone

// Safe-area insets for UI overlays
const TOP_INSET    = Platform.OS === 'ios' ? 54 : 36;
const BOTTOM_INSET = Platform.OS === 'ios' ? 28 : 16;

// Fire-zone clip starts at this fraction of MAP_H (~52% down the image)
const FIRE_CLIP_TOP = 0.52;

// ── Theme ──────────────────────────────────────────────────────
const C = {
  bg:      '#0F0E1A',
  cardBg:  'rgba(8,6,20,0.88)',
  uiBg:    'rgba(8,6,20,0.62)',
  textPri: '#EDE8FF',
  textMut: '#7B7699',
  border:  '#2E2A50',
} as const;

// ── Rainbow color hook ─────────────────────────────────────────
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

// ── Pre-generated particle data (module-level = stable) ────────
interface SparkData  { id: number; x: number; y: number; delay: number; duration: number; size: number }
interface LeafData   { id: number; x: number; y: number; delay: number; duration: number }
interface BubbleData { id: number; x: number; y: number; delay: number; duration: number; size: number }

// Sea clip region constants (fraction of MAP dimensions)
const SEA_CLIP_LEFT = 0.44;
const SEA_CLIP_TOP  = 0.14;
const SEA_CLIP_H    = 0.63; // fraction of MAP_H

// y is relative to the fire-clip container (which starts at FIRE_CLIP_TOP * MAP_H)
const SPARKS: SparkData[] = Array.from({ length: 18 }, (_, i) => ({
  id:       i,
  x:        MAP_W * (0.02 + Math.random() * 0.55),
  y:        MAP_H * (FIRE_CLIP_TOP + 0.02 + Math.random() * 0.42) - MAP_H * FIRE_CLIP_TOP,
  delay:    Math.floor(Math.random() * 2800),
  duration: 900  + Math.floor(Math.random() * 1100),
  size:     3    + Math.random() * 4.5,
}));

// Bubbles: y relative to sea-clip container (starts at SEA_CLIP_TOP * MAP_H)
// Spawn in the lower portion of the sea zone so they have room to rise
const BUBBLES: BubbleData[] = Array.from({ length: 14 }, (_, i) => ({
  id:       i,
  x:        MAP_W * (SEA_CLIP_LEFT + Math.random() * (1 - SEA_CLIP_LEFT - 0.03)) - MAP_W * SEA_CLIP_LEFT,
  y:        MAP_H * (SEA_CLIP_TOP  + 0.26 + Math.random() * 0.34) - MAP_H * SEA_CLIP_TOP,
  delay:    Math.floor(Math.random() * 4500),
  duration: 2200 + Math.floor(Math.random() * 2800),
  size:     3 + Math.random() * 5,
}));

// y is relative to the forest-clip container (starts at 0)
const LEAVES: LeafData[] = Array.from({ length: 14 }, (_, i) => ({
  id:       i,
  x:        MAP_W * (0.03 + Math.random() * 0.60),
  y:        MAP_H * (0.01 + Math.random() * 0.44),
  delay:    Math.floor(Math.random() * 4000),
  duration: 1800 + Math.floor(Math.random() * 2400),
}));

// ── Fire Spark ─────────────────────────────────────────────────
const FIRE_COLS = ['#FF4500', '#FF6B00', '#FFD700', '#FF8C00', '#FF2200', '#FFAA00'];
type AnimRef = { stop: () => void; start: (cb?: (r: { finished: boolean }) => void) => void };

function FireSpark({ x, y, delay, duration, size }: SparkData) {
  const color   = useRef(FIRE_COLS[Math.floor(Math.random() * FIRE_COLS.length)]).current;
  const riseAmt = useRef(48 + Math.random() * 64).current;
  const driftX  = useRef((Math.random() - 0.5) * 26).current;

  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  const isMounted = useRef(true);
  const animRef   = useRef<AnimRef | null>(null);

  const run = useCallback(() => {
    ty.setValue(0); tx.setValue(0); op.setValue(0);
    animRef.current = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(op, { toValue: 0.95, duration: duration * 0.22, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0,    duration: duration * 0.78, useNativeDriver: true }),
        ]),
        Animated.timing(ty, { toValue: -riseAmt, duration, useNativeDriver: true }),
        Animated.timing(tx, { toValue: driftX,   duration, useNativeDriver: true }),
      ]),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished && isMounted.current) run();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMounted.current = true;
    run();
    return () => { isMounted.current = false; animRef.current?.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:        'absolute',
        left:            x,
        top:             y,
        width:           size,
        height:          size * 1.5,
        borderRadius:    size / 2,
        backgroundColor: color,
        opacity:         op,
        transform:       [{ translateY: ty }, { translateX: tx }],
      }}
    />
  );
}

// ── Leaf Particle ──────────────────────────────────────────────
const LEAF_LIST = ['🍃', '🍃', '🌿', '🍂', '🍃'];

function LeafParticle({ x, y, delay, duration }: LeafData) {
  const leaf    = useRef(LEAF_LIST[Math.floor(Math.random() * LEAF_LIST.length)]).current;
  const fsize   = useRef(9 + Math.random() * 7).current;
  const fallAmt = useRef(60 + Math.random() * 70).current;
  const driftX  = useRef((Math.random() - 0.5) * 38).current;

  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ro = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  const isMounted = useRef(true);
  const animRef   = useRef<AnimRef | null>(null);
  const rotStr    = ro.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '30deg'] });

  const run = useCallback(() => {
    ty.setValue(0); tx.setValue(0); ro.setValue(0); op.setValue(0);
    animRef.current = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(op, { toValue: 0.82, duration: duration * 0.18, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0,    duration: duration * 0.82, useNativeDriver: true }),
        ]),
        Animated.timing(ty, { toValue: fallAmt, duration, useNativeDriver: true }),
        Animated.timing(tx, { toValue: driftX,  duration, useNativeDriver: true }),
        Animated.timing(ro, { toValue: 1,        duration, useNativeDriver: true }),
      ]),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished && isMounted.current) run();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMounted.current = true;
    run();
    return () => { isMounted.current = false; animRef.current?.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, opacity: op,
               transform: [{ translateY: ty }, { translateX: tx }, { rotate: rotStr }] }}
    >
      <Text style={{ fontSize: fsize }}>{leaf}</Text>
    </Animated.View>
  );
}

// ── Sea Bubble ─────────────────────────────────────────────────
const BUBBLE_COLORS = ['rgba(120,210,255,0.75)', 'rgba(180,235,255,0.65)', 'rgba(255,255,255,0.55)'];

function SeaBubble({ x, y, delay, duration, size }: BubbleData) {
  const color   = useRef(BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]).current;
  const riseAmt = useRef(55 + Math.random() * 75).current;
  const driftX  = useRef((Math.random() - 0.5) * 12).current;

  const ty    = useRef(new Animated.Value(0)).current;
  const tx    = useRef(new Animated.Value(0)).current;
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  const isMounted = useRef(true);
  const animRef   = useRef<AnimRef | null>(null);

  const run = useCallback(() => {
    ty.setValue(0); tx.setValue(0); op.setValue(0); scale.setValue(0.6);
    animRef.current = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        // Fade in gently, hold, then fade out near the top
        Animated.sequence([
          Animated.timing(op, { toValue: 0.55, duration: duration * 0.20, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.45, duration: duration * 0.60, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0,    duration: duration * 0.20, useNativeDriver: true }),
        ]),
        // Rise slowly upward
        Animated.timing(ty, { toValue: -riseAmt, duration, useNativeDriver: true }),
        // Slight horizontal wobble
        Animated.timing(tx, { toValue: driftX,   duration, useNativeDriver: true }),
        // Bubble grows slightly as it rises (decompression effect)
        Animated.timing(scale, { toValue: 1.3, duration, useNativeDriver: true }),
      ]),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished && isMounted.current) run();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    isMounted.current = true;
    run();
    return () => { isMounted.current = false; animRef.current?.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:        'absolute',
        left:            x,
        top:             y,
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        borderWidth:     1.2,
        borderColor:     color,
        backgroundColor: 'transparent',
        opacity:         op,
        transform:       [{ translateY: ty }, { translateX: tx }, { scale }],
      }}
    />
  );
}

// ── Pet Encounter Card ─────────────────────────────────────────
// Positions as fractions of MAP dimensions.
// Forest clearing: top-left | Sea: right half, mid-ocean | Fire: bottom-left lava field
const CARD_POS: Record<PetZone, { cx: number; cy: number }> = {
  rain_forest:  { cx: 0.18, cy: 0.23 },
  sea:          { cx: 0.60, cy: 0.46 },  // mid-ocean, well away from forest edge
  endless_fire: { cx: 0.04, cy: 0.68 },
};

const CARD_W = Math.round(MAP_W * 0.44);

function EncounterCard({ zone, pet, onFight }: {
  zone: PetZone;
  pet: WildPetInstance;
  onFight: () => void;
}) {
  const pos       = CARD_POS[zone];
  const isSuper   = pet.template.rarity === 'super_legendary';
  const rainbow   = useRainbowColor(isSuper);
  const bColor    = isSuper ? rainbow : RARITY_COLOR[pet.template.rarity];
  const left      = Math.min(pos.cx * MAP_W, MAP_W - CARD_W - 6);
  const top       = pos.cy * MAP_H;

  return (
    <Animated.View style={[styles.card, { left, top, width: CARD_W, borderColor: bColor }]}>
      <View style={styles.cardArt}>
        {pet.template.image
          ? <Image source={pet.template.image} style={styles.cardImg} />
          : <Text style={styles.cardEmoji}>{pet.template.emoji}</Text>
        }
      </View>
      <View style={styles.cardBody}>
        <Animated.Text style={[styles.cardName, { color: bColor }]} numberOfLines={1}>
          {pet.template.name}
        </Animated.Text>
        <Text style={styles.cardRarity}>{RARITY_LABEL[pet.template.rarity]}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>HP {pet.maxHp}</Text>
          <Text style={styles.stat}>ATK {pet.atk}</Text>
          <Text style={styles.stat}>SPD {pet.spd}</Text>
        </View>
        <Pressable style={styles.fightBtn} onPress={onFight}>
          <Animated.Text style={[styles.fightTxt, { color: bColor }]}>⚔️ Fight &amp; Catch</Animated.Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────
const ZONES: PetZone[] = ['rain_forest', 'sea', 'endless_fire'];
type ZoneMap = Record<PetZone, WildPetInstance>;

function spawnAll(): ZoneMap {
  return {
    rain_forest:  spawnOneWildPet('rain_forest'),
    sea:          spawnOneWildPet('sea'),
    endless_fire: spawnOneWildPet('endless_fire'),
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
    <View style={styles.screen}>
      {/* Map at correct aspect ratio — no zoom, full image visible */}
      <View style={styles.mapWrap}>

        <Image
          source={require('../../assets/pets/petMap.png')}
          style={styles.mapImg}
          resizeMode="stretch"  // container already matches image ratio — no distortion
        />

        {/* 🌿 Forest leaves */}
        <View pointerEvents="none" style={styles.forestClip}>
          {LEAVES.map(l => <LeafParticle key={l.id} {...l} />)}
        </View>

        {/* 🫧 Sea bubbles */}
        <View pointerEvents="none" style={styles.seaClip}>
          {BUBBLES.map(b => <SeaBubble key={b.id} {...b} />)}
        </View>

        {/* 🔥 Fire sparks */}
        <View pointerEvents="none" style={styles.fireClip}>
          {SPARKS.map(s => <FireSpark key={s.id} {...s} />)}
        </View>

        {/* 🐾 Encounter cards */}
        {ZONES.map(zone => (
          <EncounterCard
            key={zone}
            zone={zone}
            pet={zoneMap[zone]}
            onFight={() => onSelectPet(zoneMap[zone])}
          />
        ))}

        {/* ── Back + Title overlay (top of map) ── */}
        <View style={[styles.topBar, { top: TOP_INSET }]}>
          <Pressable style={styles.uiBtn} onPress={onBack}>
            <Text style={styles.uiBtnTxt}>← Back</Text>
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleTxt}>🗺️ Wild Encounters</Text>
          </View>
          <View style={styles.uiBtnSpacer} />
        </View>

        {/* ── Reroll overlay (bottom of map) ── */}
        <Pressable style={[styles.rerollBtn, { bottom: BOTTOM_INSET }]} onPress={reroll}>
          <Text style={styles.rerollTxt}>🔄 Respawn all pets</Text>
        </Pressable>

      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: C.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Map container — exact image aspect ratio, full width
  mapWrap: {
    width:    MAP_W,
    height:   MAP_H,
    overflow: 'hidden',
  },
  mapImg: { width: MAP_W, height: MAP_H },

  // Particle clip zones
  forestClip: {
    position: 'absolute',
    top:      0,
    left:     0,
    width:    MAP_W * 0.68,
    height:   MAP_H * 0.50,
    overflow: 'hidden',
  },
  seaClip: {
    position: 'absolute',
    top:      MAP_H * SEA_CLIP_TOP,
    left:     MAP_W * SEA_CLIP_LEFT,
    width:    MAP_W * (1 - SEA_CLIP_LEFT),
    height:   MAP_H * SEA_CLIP_H,
    overflow: 'hidden',
  },
  fireClip: {
    position: 'absolute',
    top:      MAP_H * FIRE_CLIP_TOP,
    left:     0,
    width:    MAP_W * 0.64,
    height:   MAP_H * (1 - FIRE_CLIP_TOP),
    overflow: 'hidden',
  },

  // Encounter card
  card: {
    position:        'absolute',
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.cardBg,
    borderRadius:    10,
    borderWidth:     1.5,
    padding:         7,
    gap:             7,
  },
  cardArt:   { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  cardImg:   { width: 38, height: 38, resizeMode: 'contain' },
  cardEmoji: { fontSize: 28 },
  cardBody:  { flex: 1, gap: 2 },
  cardName:  { fontSize: 11, fontWeight: '700' },
  cardRarity:{ fontSize: 9,  color: C.textMut },
  statsRow:  { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  stat: {
    fontSize:          9,
    color:             C.textMut,
    backgroundColor:   'rgba(15,14,26,0.72)',
    paddingHorizontal: 4,
    paddingVertical:   1,
    borderRadius:      4,
  },
  fightBtn: {
    marginTop:         3,
    paddingVertical:   4,
    paddingHorizontal: 6,
    backgroundColor:   'rgba(255,255,255,0.06)',
    borderRadius:      6,
    alignItems:        'center',
  },
  fightTxt: { fontSize: 11, fontWeight: '700' },

  // Top overlay bar
  topBar: {
    position:       'absolute',
    left:           12,
    right:          12,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            8,
  },
  uiBtn: {
    backgroundColor:   C.uiBg,
    paddingVertical:   7,
    paddingHorizontal: 12,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.1)',
  },
  uiBtnTxt:    { color: C.textPri, fontSize: 13, fontWeight: '600' },
  uiBtnSpacer: { width: 70 },
  titlePill: {
    flex:              1,
    backgroundColor:   C.uiBg,
    paddingVertical:   7,
    paddingHorizontal: 14,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.1)',
    alignItems:        'center',
  },
  titleTxt: { color: C.textPri, fontSize: 13, fontWeight: '700' },

  // Bottom reroll
  rerollBtn: {
    position:          'absolute',
    alignSelf:         'center',
    left:              MAP_W * 0.2,
    right:             MAP_W * 0.2,
    backgroundColor:   C.uiBg,
    paddingVertical:   11,
    borderRadius:      24,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
    alignItems:        'center',
  },
  rerollTxt: { color: C.textMut, fontSize: 13, fontWeight: '600' },
});
