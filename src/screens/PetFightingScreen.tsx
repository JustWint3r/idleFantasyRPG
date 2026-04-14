// ─────────────────────────────────────────────────────────────
//  PetFightingScreen.tsx
//  Arena battle on the lava platform stage.
//  Pets stand on the platform with zone-specific particle FX.
//  Stats shown at top, battle log at bottom.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePetCollection } from '../context/PetCollectionContext';
import { PET_TEMPLATES, simulateBattle } from '../engine/petBattleEngine';
import {
  RARITY_COLOR,
  RARITY_LABEL,
  type BattleResult,
  type PetZone,
  type WildPetInstance,
} from '../types/petCollection.types';

const { width: SW, height: SH } = Dimensions.get('window');

// Pet sprite anchor points — fraction of full screen dims
// My pet: left side    Opponent (to catch): right side
const MY_CX  = SW * 0.26;
const MY_CY  = SH * 0.50;
const OPP_CX = SW * 0.72;
const OPP_CY = SH * 0.54;

// Safe area offsets for overlays
const TOP_PAD    = Platform.OS === 'ios' ? 54 : 36;
const BOTTOM_PAD = Platform.OS === 'ios' ? 34 : 20;

// Particle box size (centered on pet's feet)
const P_BOX_W = 110;
const P_BOX_H = 150;

const ROUND_MS = 500;

const C = {
  bg:          '#0F0E1A',
  surface:     'rgba(12,11,24,0.88)',
  border:      'rgba(46,42,80,0.75)',
  textPrimary: '#EDE8FF',
  textMuted:   '#7B7699',
  gold:        '#F5C842',
  green:       '#4ADE80',
  red:         '#F87171',
} as const;

// ── Animated-ref type ──────────────────────────────────────────
type AnimRef = { stop: () => void; start: (cb?: (r: { finished: boolean }) => void) => void };

// ── Fire Spark ─────────────────────────────────────────────────
const FIRE_COLS = ['#FF4500', '#FF6B00', '#FFD700', '#FF8C00', '#FF2200', '#FFAA00'];

interface SparkData  { id: number; x: number; y: number; delay: number; duration: number; size: number }
interface LeafData   { id: number; x: number; y: number; delay: number; duration: number }
interface BubbleData { id: number; x: number; y: number; delay: number; duration: number; size: number }

function FireSpark({ x, y, delay, duration, size }: SparkData) {
  const color   = useRef(FIRE_COLS[Math.floor(Math.random() * FIRE_COLS.length)]).current;
  const riseAmt = useRef(50 + Math.random() * 60).current;
  const driftX  = useRef((Math.random() - 0.5) * 28).current;

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
    animRef.current.start(({ finished }) => { if (finished && isMounted.current) run(); });
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
        height:          size * 1.6,
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
  const fallAmt = useRef(55 + Math.random() * 65).current;
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
    animRef.current.start(({ finished }) => { if (finished && isMounted.current) run(); });
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
  const riseAmt = useRef(55 + Math.random() * 70).current;
  const driftX  = useRef((Math.random() - 0.5) * 14).current;

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
        Animated.sequence([
          Animated.timing(op, { toValue: 0.55, duration: duration * 0.20, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.45, duration: duration * 0.60, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0,    duration: duration * 0.20, useNativeDriver: true }),
        ]),
        Animated.timing(ty,    { toValue: -riseAmt, duration, useNativeDriver: true }),
        Animated.timing(tx,    { toValue: driftX,   duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.3,      duration, useNativeDriver: true }),
      ]),
    ]);
    animRef.current.start(({ finished }) => { if (finished && isMounted.current) run(); });
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

// ── Zone Particles ─────────────────────────────────────────────
// Renders zone-appropriate particles inside P_BOX_W × P_BOX_H.
// Particles spawn near the bottom (pet feet) and drift upward/downward.

function ZoneParticles({ zone }: { zone: PetZone }) {
  const sparks = useRef(Array.from({ length: 10 }, (_, i): SparkData => ({
    id:       i,
    x:        10 + Math.random() * (P_BOX_W - 20),
    y:        P_BOX_H * 0.55 + Math.random() * P_BOX_H * 0.35,
    delay:    Math.floor(Math.random() * 2000),
    duration: 750 + Math.floor(Math.random() * 850),
    size:     2.5 + Math.random() * 4,
  }))).current;

  const bubbles = useRef(Array.from({ length: 10 }, (_, i): BubbleData => ({
    id:       i,
    x:        8 + Math.random() * (P_BOX_W - 16),
    y:        P_BOX_H * 0.45 + Math.random() * P_BOX_H * 0.45,
    delay:    Math.floor(Math.random() * 3200),
    duration: 1700 + Math.floor(Math.random() * 2000),
    size:     3 + Math.random() * 5,
  }))).current;

  const leaves = useRef(Array.from({ length: 10 }, (_, i): LeafData => ({
    id:       i,
    x:        5 + Math.random() * (P_BOX_W - 10),
    y:        -10 + Math.random() * P_BOX_H * 0.25,
    delay:    Math.floor(Math.random() * 3500),
    duration: 1500 + Math.floor(Math.random() * 2000),
  }))).current;

  if (zone === 'endless_fire') return <>{sparks.map(s  => <FireSpark   key={s.id} {...s} />)}</>;
  if (zone === 'sea')          return <>{bubbles.map(b => <SeaBubble   key={b.id} {...b} />)}</>;
  if (zone === 'rain_forest')  return <>{leaves.map(l  => <LeafParticle key={l.id} {...l} />)}</>;
  return null;
}

// ── HP Bar ─────────────────────────────────────────────────────

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct   = Math.max(0, current / max);
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 300, useNativeDriver: false }).start();
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps

  const barWidth = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.hpBarWrap}>
      <Animated.View style={[styles.hpBarFill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
}

// ── Compact Stat Card (top HUD) ────────────────────────────────

function StatCard({
  label,
  name,
  rarity,
  currentHp,
  maxHp,
  align,
}: {
  label: string;
  name: string;
  rarity: string;
  currentHp: number;
  maxHp: number;
  align: 'left' | 'right';
}) {
  const color  = RARITY_COLOR[rarity as keyof typeof RARITY_COLOR] ?? C.textMuted;
  const hpPct  = currentHp / maxHp;
  const hpColor = hpPct > 0.5 ? C.green : hpPct > 0.25 ? C.gold : C.red;
  const isRight = align === 'right';

  return (
    <View style={[styles.statCard, isRight && styles.statCardRight]}>
      <Text style={[styles.statLabel, isRight && { textAlign: 'right' }]}>{label}</Text>
      <Text style={[styles.statName, { color }, isRight && { textAlign: 'right' }]} numberOfLines={1}>
        {name}
      </Text>
      <HpBar current={currentHp} max={maxHp} color={hpColor} />
      <Text style={[styles.statHp, { color: hpColor }, isRight && { textAlign: 'right' }]}>
        {Math.max(0, currentHp)} / {maxHp} HP
      </Text>
    </View>
  );
}

// ── Pet Sprite on Arena ────────────────────────────────────────

function PetSprite({
  emoji,
  image,
  shake,
  flip,
}: {
  emoji: string;
  image?: number;
  shake: Animated.Value;
  flip?: boolean;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.petSprite,
        { transform: [{ translateX: shake }, { scaleX: flip ? -1 : 1 }] },
      ]}
    >
      {image
        ? <Image source={image} style={styles.petSpriteImg} resizeMode="contain" />
        : <Text style={styles.petSpriteEmoji}>{emoji}</Text>
      }
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────

export default function PetFightingScreen({
  wildPet,
  onWin,
  onLose,
  onBack,
}: {
  wildPet: WildPetInstance;
  onWin: (performance: number) => void;
  onLose: () => void;
  onBack: () => void;
}) {
  const { ownedPets, activePetId } = usePetCollection();
  const myPet    = ownedPets.find((p) => p.id === activePetId) ?? ownedPets[0];
  const myTpl    = PET_TEMPLATES.find((t) => t.id === myPet.templateId);
  const myZone   = myTpl?.zone ?? 'endless_fire';
  const oppZone  = wildPet.template.zone;

  const [result]       = useState<BattleResult>(() => simulateBattle(myPet, wildPet));
  const [step, setStep]  = useState(0);
  const [done, setDone]  = useState(false);
  const [log,  setLog]   = useState<string[]>([]);

  const [playerHp, setPlayerHp] = useState(myPet.maxHp);
  const [wildHp,   setWildHp]   = useState(wildPet.maxHp);

  const playerShake = useRef(new Animated.Value(0)).current;
  const wildShake   = useRef(new Animated.Value(0)).current;
  const logScrollRef = useRef<ScrollView>(null);

  function shakeAnim(target: Animated.Value) {
    Animated.sequence([
      Animated.timing(target, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(target, { toValue:  10, duration: 55, useNativeDriver: true }),
      Animated.timing(target, { toValue:  -5, duration: 45, useNativeDriver: true }),
      Animated.timing(target, { toValue:   0, duration: 45, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    if (step >= result.rounds.length) { setDone(true); return; }
    const timer = setTimeout(() => {
      const round = result.rounds[step];
      setPlayerHp(round.playerHpAfter);
      setWildHp(round.wildHpAfter);
      if (round.attacker === 'player') {
        shakeAnim(playerShake);
        setLog(prev => [...prev, `${myPet.name} attacks for ${round.damage} dmg!`]);
      } else {
        shakeAnim(wildShake);
        setLog(prev => [...prev, `${wildPet.template.name} attacks for ${round.damage} dmg!`]);
      }
      setStep(s => s + 1);
    }, ROUND_MS);
    return () => clearTimeout(timer);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logScrollRef.current?.scrollToEnd({ animated: true });
  }, [log]);

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../../assets/pets/Pet_Fighting_Scene.png')}
        style={styles.fullBg}
        resizeMode="cover"
      >

        {/* ── Particles (behind sprites) ── */}
        <View pointerEvents="none" style={[styles.particleBox, { left: OPP_CX - P_BOX_W / 2, top: OPP_CY - P_BOX_H }]}>
          <ZoneParticles zone={oppZone} />
        </View>
        <View pointerEvents="none" style={[styles.particleBox, { left: MY_CX - P_BOX_W / 2, top: MY_CY - P_BOX_H }]}>
          <ZoneParticles zone={myZone} />
        </View>

        {/* ── Pet sprites on platform ── */}
        {/* My pet: left side, faces right */}
        <View style={[styles.spriteAnchor, { left: MY_CX - 36, top: MY_CY - 72 }]}>
          <PetSprite emoji={myPet.emoji} image={myTpl?.image} shake={playerShake} />
        </View>
        {/* Opponent (to catch): right side, flipped to face left */}
        <View style={[styles.spriteAnchor, { left: OPP_CX - 36, top: OPP_CY - 72 }]}>
          <PetSprite emoji={wildPet.template.emoji} image={wildPet.template.image} shake={wildShake} flip />
        </View>

        {/* ── HUD overlay (top) ── */}
        <View style={[styles.hudOverlay, { top: TOP_PAD }]}>
          <StatCard
            label="MY PET"
            name={myPet.name}
            rarity={myPet.rarity}
            currentHp={playerHp}
            maxHp={myPet.maxHp}
            align="left"
          />
          <View style={styles.hudVs}>
            <Text style={styles.hudVsTxt}>VS</Text>
          </View>
          <StatCard
            label="OPPONENT"
            name={wildPet.template.name}
            rarity={wildPet.template.rarity}
            currentHp={wildHp}
            maxHp={wildPet.maxHp}
            align="right"
          />
        </View>

        {/* ── Back button ── */}
        {!done && (
          <Pressable style={[styles.backBtn, { top: TOP_PAD + 6 }]} onPress={onBack}>
            <Text style={styles.backTxt}>← Retreat</Text>
          </Pressable>
        )}

        {/* ── Battle log overlay (bottom, during fight) ── */}
        {!done && (
          <ScrollView
            ref={logScrollRef}
            style={[styles.logOverlay, { bottom: BOTTOM_PAD + 8 }]}
            contentContainerStyle={styles.logContent}
            scrollEnabled
          >
            {log.map((line, i) => (
              <Text key={i} style={styles.logLine}>{line}</Text>
            ))}
            <Text style={styles.logLine}>…</Text>
          </ScrollView>
        )}

        {/* ── Result overlay (bottom, when done) ── */}
        {done && (
          <View style={[styles.resultOverlay, { bottom: BOTTOM_PAD }]}>
            {result.winner === 'player' ? (
              <>
                <Text style={styles.resultWin}>🏆 You Win!</Text>
                <Text style={styles.resultSub}>
                  Performance: {Math.round(result.performance * 100)}% HP remaining
                </Text>
                <Pressable style={styles.proceedBtn} onPress={() => onWin(result.performance)}>
                  <Text style={styles.proceedBtnTxt}>Proceed to Catch →</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.resultLose}>💀 Defeated…</Text>
                <Text style={styles.resultSub}>Your pet fainted. Try again!</Text>
                <Pressable style={styles.retreatBtn} onPress={onLose}>
                  <Text style={styles.retreatBtnTxt}>← Retreat</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

      </ImageBackground>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Root fills the whole screen — no scrolling
  screen: {
    flex:     1,
    overflow: 'hidden',
  },

  // Background image covers 100% of screen
  fullBg: {
    flex: 1,
    width: SW,
    height: SH,
  },

  // ─ HUD overlay (absolute, top) ─
  hudOverlay: {
    position:          'absolute',
    left:              10,
    right:             10,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
  },
  statCard: {
    flex:            1,
    backgroundColor: 'rgba(10,9,22,0.78)',
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     'rgba(46,42,80,0.65)',
    padding:         10,
    gap:             2,
  },
  statCardRight: {},
  statLabel: {
    fontSize:      9,
    color:         C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statName: {
    fontSize:   13,
    fontWeight: '700',
  },
  hpBarWrap: {
    width:           '100%',
    height:          6,
    backgroundColor: 'rgba(46,42,80,0.5)',
    borderRadius:    3,
    overflow:        'hidden',
    marginTop:       4,
  },
  hpBarFill: { height: '100%', borderRadius: 3 },
  statHp: {
    fontSize:   10,
    fontWeight: '600',
    marginTop:  2,
  },
  hudVs: {
    width:          34,
    alignItems:     'center',
    justifyContent: 'center',
  },
  hudVsTxt: {
    fontSize:   14,
    fontWeight: '900',
    color:      C.textMuted,
  },

  // ─ Particles ─
  particleBox: {
    position: 'absolute',
    width:    P_BOX_W,
    height:   P_BOX_H,
    overflow: 'visible',
  },

  // ─ Pet sprites ─
  spriteAnchor: {
    position:       'absolute',
    width:          72,
    height:         72,
    alignItems:     'center',
    justifyContent: 'flex-end',
  },
  petSprite: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  petSpriteImg: {
    width:  72,
    height: 72,
  },
  petSpriteEmoji: {
    fontSize:   54,
    lineHeight: 64,
  },

  // ─ Back button ─
  backBtn: {
    position:          'absolute',
    left:              10,
    backgroundColor:   'rgba(8,6,20,0.65)',
    paddingVertical:   6,
    paddingHorizontal: 12,
    borderRadius:      18,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.1)',
  },
  backTxt: { color: C.textMuted, fontSize: 13, fontWeight: '600' },

  // ─ Battle log overlay (bottom, transparent) ─
  logOverlay: {
    position:          'absolute',
    left:              12,
    right:             12,
    maxHeight:         110,
    backgroundColor:   'rgba(8,6,20,0.62)',
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       'rgba(46,42,80,0.5)',
  },
  logContent: { padding: 10, gap: 3 },
  logLine:    { fontSize: 12, color: C.textMuted, lineHeight: 18 },

  // ─ Result overlay (bottom, transparent glass) ─
  resultOverlay: {
    position:          'absolute',
    left:              16,
    right:             16,
    backgroundColor:   'rgba(8,6,20,0.72)',
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
    padding:           22,
    alignItems:        'center',
    gap:               10,
  },
  resultWin:      { fontSize: 24, fontWeight: '700', color: C.green },
  resultLose:     { fontSize: 24, fontWeight: '700', color: C.red },
  resultSub:      { fontSize: 13, color: C.textMuted },
  proceedBtn:     { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36, marginTop: 4 },
  proceedBtnTxt:  { fontSize: 16, fontWeight: '700', color: C.bg },
  retreatBtn:     { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36, borderWidth: 1, borderColor: 'rgba(46,42,80,0.8)' },
  retreatBtnTxt:  { fontSize: 16, color: C.textMuted },
});
