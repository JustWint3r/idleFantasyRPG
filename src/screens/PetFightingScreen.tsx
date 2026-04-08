// ─────────────────────────────────────────────────────────────
//  PetFightingScreen.tsx
//  Animated auto-battle between your active pet and a wild pet.
//  Win → proceed to catch. Lose → retreat.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePetCollection } from '../context/PetCollectionContext';
import { simulateBattle } from '../engine/petBattleEngine';
import {
  RARITY_COLOR,
  RARITY_LABEL,
  type BattleResult,
  type WildPetInstance,
} from '../types/petCollection.types';

const ROUND_MS = 500; // ms between each battle step

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

// ── HP Bar ────────────────────────────────────────────────────

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct    = Math.max(0, current / max);
  const width  = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const barWidth = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.hpBarWrap}>
      <Animated.View style={[styles.hpBarFill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
}

// ── Fighter card ──────────────────────────────────────────────

function FighterCard({
  emoji,
  name,
  rarity,
  currentHp,
  maxHp,
  label,
  shake,
}: {
  emoji: string;
  name: string;
  rarity: string;
  currentHp: number;
  maxHp: number;
  label: string;
  shake: Animated.Value;
}) {
  const color = RARITY_COLOR[rarity as keyof typeof RARITY_COLOR] ?? C.textMuted;
  const hpPct = currentHp / maxHp;
  const hpColor = hpPct > 0.5 ? C.green : hpPct > 0.25 ? C.gold : C.red;

  return (
    <Animated.View style={[styles.fighterCard, { transform: [{ translateX: shake }] }]}>
      <Text style={styles.fighterLabel}>{label}</Text>
      <Text style={styles.fighterEmoji}>{emoji}</Text>
      <Text style={[styles.fighterName, { color }]}>{name}</Text>
      <Text style={styles.fighterRarity}>{RARITY_LABEL[rarity as keyof typeof RARITY_LABEL]}</Text>
      <HpBar current={currentHp} max={maxHp} color={hpColor} />
      <Text style={[styles.hpText, { color: hpColor }]}>
        {Math.max(0, currentHp)} / {maxHp} HP
      </Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────

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
  const myPet = ownedPets.find((p) => p.id === activePetId) ?? ownedPets[0];

  const [result]          = useState<BattleResult>(() => simulateBattle(myPet, wildPet));
  const [step, setStep]   = useState(0);          // current round index being displayed
  const [done, setDone]   = useState(false);
  const [log,  setLog]    = useState<string[]>([]);

  // Live HP state driven by battle rounds
  const [playerHp, setPlayerHp] = useState(myPet.maxHp);
  const [wildHp,   setWildHp]   = useState(wildPet.maxHp);

  const playerShake = useRef(new Animated.Value(0)).current;
  const wildShake   = useRef(new Animated.Value(0)).current;

  const logScrollRef = useRef<ScrollView>(null);

  function shakeAnim(target: Animated.Value) {
    Animated.sequence([
      Animated.timing(target, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(target, { toValue:  8,  duration: 60, useNativeDriver: true }),
      Animated.timing(target, { toValue: -4,  duration: 50, useNativeDriver: true }),
      Animated.timing(target, { toValue:  0,  duration: 50, useNativeDriver: true }),
    ]).start();
  }

  // Tick through rounds
  useEffect(() => {
    if (step >= result.rounds.length) {
      setDone(true);
      return;
    }
    const timer = setTimeout(() => {
      const round = result.rounds[step];
      setPlayerHp(round.playerHpAfter);
      setWildHp(round.wildHpAfter);

      if (round.attacker === 'player') {
        shakeAnim(wildShake);
        setLog((prev) => [
          ...prev,
          `${myPet.emoji} attacks for ${round.damage} dmg!`,
        ]);
      } else {
        shakeAnim(playerShake);
        setLog((prev) => [
          ...prev,
          `${wildPet.template.emoji} attacks for ${round.damage} dmg!`,
        ]);
      }

      setStep((s) => s + 1);
    }, ROUND_MS);

    return () => clearTimeout(timer);
  }, [step]);

  // Auto-scroll log to bottom
  useEffect(() => {
    logScrollRef.current?.scrollToEnd({ animated: true });
  }, [log]);

  return (
    <View style={styles.screen}>
      {/* Back (only before battle ends) */}
      {!done && (
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Retreat</Text>
        </Pressable>
      )}

      <Text style={styles.vsLabel}>⚔️ Battle</Text>

      {/* Fighters */}
      <View style={styles.fightersRow}>
        <FighterCard
          emoji={wildPet.template.emoji}
          name={wildPet.template.name}
          rarity={wildPet.template.rarity}
          currentHp={wildHp}
          maxHp={wildPet.maxHp}
          label="Opponent Pet"
          shake={wildShake}
        />
        <Text style={styles.vsText}>VS</Text>
        <FighterCard
          emoji={myPet.emoji}
          name={myPet.name}
          rarity={myPet.rarity}
          currentHp={playerHp}
          maxHp={myPet.maxHp}
          label="My Pet"
          shake={playerShake}
        />
      </View>

      {/* Battle log */}
      <ScrollView
        ref={logScrollRef}
        style={styles.logBox}
        contentContainerStyle={{ padding: 10, gap: 4 }}
      >
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>{line}</Text>
        ))}
        {!done && <Text style={styles.logLine}>…</Text>}
      </ScrollView>

      {/* Result */}
      {done && (
        <View style={styles.resultBox}>
          {result.winner === 'player' ? (
            <>
              <Text style={styles.resultWin}>🏆 You Win!</Text>
              <Text style={styles.resultSub}>
                Performance: {Math.round(result.performance * 100)}% HP remaining
              </Text>
              <Pressable
                style={styles.proceedBtn}
                onPress={() => onWin(result.performance)}
              >
                <Text style={styles.proceedBtnText}>Proceed to Catch →</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.resultLose}>💀 Defeated…</Text>
              <Text style={styles.resultSub}>Your pet fainted. Try again!</Text>
              <Pressable style={styles.retreatBtn} onPress={onLose}>
                <Text style={styles.retreatBtnText}>← Retreat</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 },

  backBtn:  { flexDirection: 'row' },
  backText: { color: C.textMuted, fontSize: 14 },
  vsLabel:  { fontSize: 18, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },

  fightersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsText: { fontSize: 20, fontWeight: '900', color: C.textMuted, width: 30, textAlign: 'center' },

  fighterCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  fighterLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  fighterEmoji: { fontSize: 48 },
  fighterName:  { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  fighterRarity:{ fontSize: 10, color: C.textMuted },
  hpBarWrap: { width: '100%', height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  hpBarFill: { height: '100%', borderRadius: 4 },
  hpText: { fontSize: 11, fontWeight: '600' },

  logBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 160,
  },
  logLine: { fontSize: 12, color: C.textMuted, lineHeight: 18 },

  resultBox:    { backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 18, alignItems: 'center', gap: 8 },
  resultWin:    { fontSize: 22, fontWeight: '700', color: C.green },
  resultLose:   { fontSize: 22, fontWeight: '700', color: C.red },
  resultSub:    { fontSize: 13, color: C.textMuted },
  proceedBtn:   { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 4 },
  proceedBtnText:{ fontSize: 15, fontWeight: '700', color: C.bg },
  retreatBtn:   { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: C.border },
  retreatBtnText:{ fontSize: 15, color: C.textMuted },
});
