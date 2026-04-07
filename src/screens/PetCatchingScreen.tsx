// ─────────────────────────────────────────────────────────────
//  PetCatchingScreen.tsx
//  Throw a ball to catch the wild pet.
//  Catch rate = battle performance × rarity difficulty.
//  Better fight → higher chance. Rarer pet → lower base rate.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

const C = {
  bg:          '#0F0E1A',
  surface:     '#1A1830',
  surfaceHigh: '#242140',
  border:      '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted:   '#7B7699',
  gold:        '#F5C842',
  green:       '#4ADE80',
  red:         '#F87171',
} as const;

// ── Throw ball animation ──────────────────────────────────────

function ThrowBall({
  onThrow,
  disabled,
}: {
  onThrow: () => void;
  disabled: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rainbowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rainbowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
    ).start();
    return () => rainbowAnim.stopAnimation();
  }, []);

  const borderColor = rainbowAnim.interpolate({
    inputRange: RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });

  function handlePress() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 100, useNativeDriver: false, easing: Easing.out(Easing.quad) }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 150, useNativeDriver: false, easing: Easing.out(Easing.bounce) }),
    ]).start(() => onThrow());
  }

  return (
    <Animated.View
      style={[
        styles.ballOuter,
        { borderColor, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        style={[styles.ballInner, disabled && { opacity: 0.4 }]}
        onPress={disabled ? undefined : handlePress}
        disabled={disabled}
      >
        <Text style={styles.ballEmoji}>🎾</Text>
        <Text style={styles.ballText}>{disabled ? '…' : 'Throw!'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Catch result overlay ──────────────────────────────────────

function CatchResult({
  success,
  petEmoji,
  petName,
  onDone,
}: {
  success: boolean;
  petEmoji: string;
  petName: string;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.resultOverlay}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.resultEmoji}>{success ? '🎉' : '💨'}</Text>
        <Text style={success ? styles.resultWin : styles.resultFail}>
          {success ? 'Caught!' : 'Escaped!'}
        </Text>
        {success ? (
          <Text style={styles.resultDesc}>
            {petEmoji}  {petName} has joined your team!
          </Text>
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
  const catchRate = calcCatchRate(wildPet.template, performance);

  const [throwing,  setThrowing]  = useState(false);
  const [catchResult, setCatchResult] = useState<boolean | null>(null);

  const color = RARITY_COLOR[wildPet.template.rarity];

  // Chance bar pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  function handleThrow() {
    setThrowing(true);
    setTimeout(() => {
      const success = attemptCatch(catchRate);
      if (success) {
        addPet(ownedPetFromTemplate(wildPet.template));
      }
      setCatchResult(success);
      setThrowing(false);
    }, 1200);
  }

  return (
    <View style={styles.screen}>
      {/* Wild pet display */}
      <View style={[styles.petCard, { borderColor: color }]}>
        <Text style={styles.petEmoji}>{wildPet.template.emoji}</Text>
        <Text style={[styles.petName, { color }]}>{wildPet.template.name}</Text>
        <Text style={styles.petRarity}>{RARITY_LABEL[wildPet.template.rarity]}</Text>
      </View>

      {/* Catch rate */}
      <Animated.View
        style={[styles.rateCard, { transform: [{ scale: pulseAnim }] }]}
      >
        <Text style={styles.rateLabel}>Catch Rate</Text>
        <Text
          style={[
            styles.rateVal,
            {
              color:
                catchRate >= 60 ? C.green :
                catchRate >= 30 ? C.gold  : C.red,
            },
          ]}
        >
          {catchRate}%
        </Text>
        <Text style={styles.rateSub}>
          Battle performance: {Math.round(performance * 100)}%
        </Text>
      </Animated.View>

      {/* Hint */}
      <Text style={styles.hint}>
        {wildPet.template.rarity === 'super_legendary'
          ? '✨ Super Legendary! Extremely rare catch!'
          : wildPet.template.rarity === 'legendary'
          ? '⭐ Legendary! Hard to catch — good luck!'
          : '💙 Rare pet — you\'ve got a solid shot!'}
      </Text>

      {/* Throw ball button */}
      <ThrowBall onThrow={handleThrow} disabled={throwing || catchResult !== null} />

      {/* Result overlay */}
      {catchResult !== null && (
        <CatchResult
          success={catchResult}
          petEmoji={wildPet.template.emoji}
          petName={wildPet.template.name}
          onDone={onDone}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  petCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
  },
  petEmoji:  { fontSize: 72 },
  petName:   { fontSize: 22, fontWeight: '700' },
  petRarity: { fontSize: 13, color: C.textMuted, letterSpacing: 1 },

  rateCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  rateLabel: { fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  rateVal:   { fontSize: 42, fontWeight: '900' },
  rateSub:   { fontSize: 12, color: C.textMuted },

  hint: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  // Throw ball
  ballOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  ballInner: { alignItems: 'center', gap: 4 },
  ballEmoji: { fontSize: 36 },
  ballText:  { fontSize: 12, fontWeight: '700', color: C.textPrimary },

  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000099',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  resultCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: C.border,
  },
  resultEmoji: { fontSize: 52 },
  resultWin:   { fontSize: 28, fontWeight: '900', color: C.green },
  resultFail:  { fontSize: 28, fontWeight: '900', color: C.red },
  resultDesc:  { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  doneBtn:     { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
});
