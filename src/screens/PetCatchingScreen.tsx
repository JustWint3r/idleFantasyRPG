// ─────────────────────────────────────────────────────────────
//  PetCatchingScreen.tsx
//  Full-screen catching arena.
//  Pet_Catching_Scene.png background, Pet_Ball.png throw animation.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePetCollection } from '../context/PetCollectionContext';
import {
  attemptCatch,
  calcCatchRate,
  ownedPetFromTemplate,
} from '../engine/petBattleEngine';
import {
  RAINBOW_CYCLE,
  RARITY_COLOR,
  RARITY_LABEL,
  type WildPetInstance,
} from '../types/petCollection.types';

const { width: SW, height: SH } = Dimensions.get('window');
const TOP_PAD    = Platform.OS === 'ios' ? 54 : 36;
const BOTTOM_PAD = Platform.OS === 'ios' ? 34 : 20;

// Pet display position on the scene (fraction of screen)
const PET_CENTER_Y = SH * 0.36;
// Ball resting position
const BALL_REST_Y  = SH * 0.72;
// Arc travel distance (ball → pet)
const ARC_DIST     = BALL_REST_Y - PET_CENTER_Y;

const C = {
  bg:          '#0F0E1A',
  surface:     'rgba(10,9,22,0.82)',
  border:      'rgba(46,42,80,0.7)',
  textPrimary: '#EDE8FF',
  textMuted:   '#7B7699',
  gold:        '#F5C842',
  green:       '#4ADE80',
  red:         '#F87171',
} as const;

// ── Floating bob for the wild pet ─────────────────────────────

function useBobAnim() {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -10, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue:   0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    return () => bob.stopAnimation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return bob;
}

// ── Rainbow color hook ────────────────────────────────────────

function useRainbowColor(active: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return anim.interpolate({
    inputRange:  RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });
}

// ── Catch result overlay ──────────────────────────────────────

function CatchResult({
  success,
  petEmoji,
  petImage,
  petName,
  onDone,
}: {
  success: boolean;
  petEmoji: string;
  petImage?: number;
  petName: string;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.resultOverlay}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.resultEmoji}>{success ? '🎉' : '💨'}</Text>
        <Text style={success ? styles.resultWin : styles.resultFail}>
          {success ? 'Caught!' : 'Escaped!'}
        </Text>
        {success ? (
          <View style={styles.resultDescRow}>
            {petImage
              ? <Image source={petImage} style={styles.resultPetImage} />
              : <Text style={styles.resultPetEmoji}>{petEmoji}</Text>
            }
            <Text style={styles.resultDesc}>{petName} has joined your team!</Text>
          </View>
        ) : (
          <Text style={styles.resultDesc}>The pet broke free and escaped…</Text>
        )}
        <Pressable style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>{success ? 'Awesome! 🎉' : 'Try again'}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function PetCatchingScreen({
  wildPet,
  performance,
  onDone,
}: {
  wildPet: WildPetInstance;
  performance: number;
  onDone: () => void;
}) {
  const { addPet } = usePetCollection();
  const catchRate  = calcCatchRate(wildPet.template, performance);

  const [throwing,    setThrowing]    = useState(false);
  const [catchResult, setCatchResult] = useState<boolean | null>(null);

  const isSuper     = wildPet.template.rarity === 'super_legendary';
  const rarityColor = RARITY_COLOR[wildPet.template.rarity];
  const rainbow     = useRainbowColor(isSuper);
  const petColor    = isSuper ? rainbow : rarityColor;

  // ── Animations ──────────────────────────────────────────────
  const bobAnim      = useBobAnim();

  // Catch rate badge pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    ).start();
    return () => pulseAnim.stopAnimation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ball throw arc (0 → 1 = resting → at pet)
  const throwProgress = useRef(new Animated.Value(0)).current;
  // Ball rotation during flight
  const ballRotate    = useRef(new Animated.Value(0)).current;
  // Wobble on impact
  const impactWobble  = useRef(new Animated.Value(0)).current;
  // Ball opacity (hide after impact resolves)
  const ballOpacity   = useRef(new Animated.Value(1)).current;

  // Pet flash on impact
  const petOpacity    = useRef(new Animated.Value(1)).current;

  const throwArcY = throwProgress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -ARC_DIST],
  });
  // Slight left curve mid-arc
  const throwArcX = throwProgress.interpolate({
    inputRange:  [0, 0.45, 1],
    outputRange: [0, -SW * 0.06, 0],
  });
  // Shrink slightly as ball travels "into" the scene
  const throwScale = throwProgress.interpolate({
    inputRange:  [0, 1],
    outputRange: [1, 0.72],
  });
  const ballRotateDeg = ballRotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  function handleThrow() {
    setThrowing(true);
    throwProgress.setValue(0);
    ballRotate.setValue(0);
    ballOpacity.setValue(1);
    petOpacity.setValue(1);
    impactWobble.setValue(0);

    // Phase 1: Ball arcs toward pet with spin
    Animated.parallel([
      Animated.timing(throwProgress, {
        toValue:  1,
        duration: 550,
        easing:   Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ballRotate, {
        toValue:  3,   // 3 full spins during flight
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Pet flashes (absorbed into ball)
      Animated.sequence([
        Animated.timing(petOpacity, { toValue: 0,   duration: 150, useNativeDriver: true }),
        Animated.timing(petOpacity, { toValue: 0.4, duration: 80,  useNativeDriver: true }),
        Animated.timing(petOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
      ]).start();

      // Phase 3: Ball wobbles (catching attempt)
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(impactWobble, { toValue: -14, duration: 80,  useNativeDriver: true }),
        Animated.timing(impactWobble, { toValue:  14, duration: 80,  useNativeDriver: true }),
        Animated.timing(impactWobble, { toValue: -10, duration: 70,  useNativeDriver: true }),
        Animated.timing(impactWobble, { toValue:  10, duration: 70,  useNativeDriver: true }),
        Animated.timing(impactWobble, { toValue:  -6, duration: 60,  useNativeDriver: true }),
        Animated.timing(impactWobble, { toValue:   0, duration: 60,  useNativeDriver: true }),
        Animated.delay(300),
      ]).start(() => {
        const success = attemptCatch(catchRate);
        if (success) addPet(ownedPetFromTemplate(wildPet.template));
        // Fade ball out before showing result
        Animated.timing(ballOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setCatchResult(success);
          setThrowing(false);
        });
      });
    });
  }

  const showBall = catchResult === null;

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../../assets/pets/Pet_Catching_Scene.png')}
        style={styles.fullBg}
        resizeMode="cover"
      >

        {/* ── HUD overlay (top) ── */}
        <View style={[styles.hudOverlay, { top: TOP_PAD }]}>
          <Animated.Text style={[styles.hudName, { color: petColor }]} numberOfLines={1}>
            {wildPet.template.name}
          </Animated.Text>
          <Text style={styles.hudRarity}>{RARITY_LABEL[wildPet.template.rarity]}</Text>
          <Animated.View style={[styles.rateRow, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.rateLabel}>Catch Rate  </Text>
            <Text style={[
              styles.rateVal,
              { color: catchRate >= 60 ? C.green : catchRate >= 30 ? C.gold : C.red },
            ]}>
              {catchRate}%
            </Text>
          </Animated.View>
          <Text style={styles.rateSub}>Battle performance: {Math.round(performance * 100)}%</Text>
        </View>

        {/* ── Wild pet (bobs while waiting, fades on impact) ── */}
        {catchResult === null && (
          <Animated.View
            style={[
              styles.petContainer,
              { top: PET_CENTER_Y - 60, opacity: petOpacity, transform: [{ translateY: bobAnim }] },
            ]}
          >
            {wildPet.template.image
              ? <Image source={wildPet.template.image} style={styles.petImage} resizeMode="contain" />
              : <Text style={styles.petEmoji}>{wildPet.template.emoji}</Text>
            }
          </Animated.View>
        )}

        {/* ── Hint text ── */}
        {!throwing && catchResult === null && (
          <View style={styles.hintContainer}>
            <Text style={styles.hint}>
              {isSuper
                ? '✨ Super Legendary! Extremely rare!'
                : wildPet.template.rarity === 'legendary'
                ? '⭐ Legendary — hard to catch, good luck!'
                : '💙 Rare pet — you\'ve got a solid shot!'}
            </Text>
          </View>
        )}

        {/* ── Pet ball (animated, no label inside) ── */}
        {showBall && (
          <Animated.View
            style={[
              styles.ballContainer,
              {
                bottom:  BOTTOM_PAD + 40,
                opacity: ballOpacity,
                transform: [
                  { translateY: throwArcY },
                  { translateX: throwArcX },
                  { scale:      throwScale },
                  { rotate:     ballRotateDeg },
                ],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ translateX: impactWobble }] }}>
              <Pressable
                onPress={!throwing ? handleThrow : undefined}
                disabled={throwing}
                style={styles.ballPressable}
              >
                <Image
                  source={require('../../assets/pets/Pet_Ball.png')}
                  style={styles.ballImage}
                  resizeMode="contain"
                />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── "Tap to throw!" label — fixed, never animates with ball ── */}
        {showBall && !throwing && (
          <View style={[styles.throwLabelContainer, { bottom: BOTTOM_PAD + 16 }]}>
            <Text style={styles.throwLabel}>Tap to throw!</Text>
          </View>
        )}

        {/* ── Result overlay ── */}
        {catchResult !== null && (
          <CatchResult
            success={catchResult}
            petEmoji={wildPet.template.emoji}
            petImage={wildPet.template.image}
            petName={wildPet.template.name}
            onDone={onDone}
          />
        )}

      </ImageBackground>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:     1,
    overflow: 'hidden',
  },
  fullBg: {
    flex:   1,
    width:  SW,
    height: SH,
  },

  // ─ HUD top ─
  hudOverlay: {
    position:        'absolute',
    left:            16,
    right:           16,
    alignItems:      'center',
    backgroundColor: 'rgba(8,6,20,0.72)',
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     C.border,
    paddingVertical: 12,
    gap:             4,
  },
  hudName:   { fontSize: 20, fontWeight: '800' },
  hudRarity: { fontSize: 11, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  rateRow:   { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  rateLabel: { fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  rateVal:   { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  rateSub:   { fontSize: 11, color: C.textMuted },

  // ─ Wild pet ─
  petContainer: {
    position:   'absolute',
    alignSelf:  'center',
    left:       SW / 2 - 55,
    alignItems: 'center',
  },
  petEmoji: { fontSize: 90, lineHeight: 100 },
  petImage: { width: 110, height: 110 },

  // ─ Hint ─
  hintContainer: {
    position:   'absolute',
    left:       24,
    right:      24,
    top:        SH * 0.56,
    alignItems: 'center',
  },
  hint: {
    fontSize:          13,
    color:             C.textMuted,
    textAlign:         'center',
    backgroundColor:   'rgba(8,6,20,0.60)',
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       C.border,
  },

  // ─ Ball ─
  ballContainer: {
    position:   'absolute',
    left:       SW / 2 - 75,
    alignItems: 'center',
  },
  ballPressable: { alignItems: 'center' },
  ballImage:     { width: 150, height: 150 },

  // ─ Throw label (fixed, separate from ball so it doesn't animate away) ─
  throwLabelContainer: {
    position:   'absolute',
    alignSelf:  'center',
    left:       0,
    right:      0,
    alignItems: 'center',
  },
  throwLabel: {
    fontSize:          15,
    fontWeight:        '700',
    color:             C.textPrimary,
    backgroundColor:   'rgba(8,6,20,0.75)',
    paddingHorizontal: 22,
    paddingVertical:   8,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       C.border,
    overflow:          'hidden',
  },

  // ─ Result overlay ─
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         32,
  },
  resultCard: {
    backgroundColor: 'rgba(22,20,46,0.97)',
    borderRadius:    20,
    padding:         32,
    alignItems:      'center',
    gap:             12,
    width:           '100%',
    borderWidth:     1,
    borderColor:     C.border,
  },
  resultEmoji:    { fontSize: 52 },
  resultWin:      { fontSize: 28, fontWeight: '900', color: C.green },
  resultFail:     { fontSize: 28, fontWeight: '900', color: C.red },
  resultDescRow:  { alignItems: 'center', gap: 8 },
  resultPetImage: { width: 80, height: 80 },
  resultPetEmoji: { fontSize: 52 },
  resultDesc:     { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  doneBtn:        { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  doneBtnText:    { fontSize: 15, fontWeight: '700', color: C.bg },
});
