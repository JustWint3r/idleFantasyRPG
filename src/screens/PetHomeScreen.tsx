// ─────────────────────────────────────────────────────────────
//  PetHomeScreen.tsx
//  Main pet page: active pet display, owned pets list,
//  Upgrade / Select / Catch actions.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePetCollection } from '../context/PetCollectionContext';
import {
  expToNextLevel,
} from '../engine/petBattleEngine';
import {
  RAINBOW_CYCLE,
  RARITY_COLOR,
  RARITY_LABEL,
  type OwnedPet,
  type PetRarity,
} from '../types/petCollection.types';

// ── Colours ───────────────────────────────────────────────────

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

// ── Rainbow border animation ──────────────────────────────────

function RarityCard({
  rarity,
  children,
  style,
}: {
  rarity: PetRarity;
  children: React.ReactNode;
  style?: object;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rarity !== 'super_legendary') return;
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    ).start();
    return () => anim.stopAnimation();
  }, [rarity]);

  if (rarity === 'super_legendary') {
    const borderColor = anim.interpolate({
      inputRange:  RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
      outputRange: RAINBOW_CYCLE,
    });
    return (
      <Animated.View style={[style, styles.rarityBase, { borderColor, borderWidth: 3 }]}>
        {children}
      </Animated.View>
    );
  }

  const color = RARITY_COLOR[rarity];
  return (
    <View style={[style, styles.rarityBase, { borderColor: color, borderWidth: 2 }]}>
      {children}
    </View>
  );
}

// ── EXP bar ───────────────────────────────────────────────────

function ExpBar({ pet }: { pet: OwnedPet }) {
  const needed = expToNextLevel(pet.level);
  const pct    = Math.min(1, pet.exp / needed);
  return (
    <View style={styles.expBarWrap}>
      <View style={[styles.expBarFill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}

// ── Pet card (collection list) ────────────────────────────────

function PetListCard({
  pet,
  isActive,
  onSelect,
}: {
  pet: OwnedPet;
  isActive: boolean;
  onSelect: () => void;
}) {
  const color = RARITY_COLOR[pet.rarity];
  return (
    <Pressable
      style={[styles.listCard, isActive && { borderColor: color, borderWidth: 2 }]}
      onPress={onSelect}
    >
      <Text style={styles.listEmoji}>{pet.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listName, { color }]}>{pet.name}</Text>
        <Text style={styles.listMeta}>
          {RARITY_LABEL[pet.rarity]} · Lv {pet.level}
        </Text>
      </View>
      {isActive && <Text style={[styles.activeTag, { color }]}>Active</Text>}
    </Pressable>
  );
}

// ── Upgrade / Feed modal ──────────────────────────────────────

function UpgradeModal({
  pet,
  visible,
  onClose,
}: {
  pet: OwnedPet;
  visible: boolean;
  onClose: () => void;
}) {
  const { upgradePet } = usePetCollection();
  const needed = expToNextLevel(pet.level);

  function feed(amount: number) {
    upgradePet(pet.id, amount);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.upgradeCard} onPress={() => {}}>
          <Text style={styles.upgradeTitle}>Feed Pet</Text>
          <Text style={styles.upgradeSub}>
            {pet.emoji}  {pet.name} · Lv {pet.level}
          </Text>
          <Text style={styles.upgradeSub}>
            EXP  {pet.exp} / {needed}
          </Text>

          <View style={styles.feedRow}>
            {[10, 50, 100].map((amt) => (
              <Pressable key={amt} style={styles.feedBtn} onPress={() => feed(amt)}>
                <Text style={styles.feedBtnText}>+{amt} EXP</Text>
                <Text style={styles.feedBtnCost}>📖 {amt}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Pet selection modal ───────────────────────────────────────

function SelectModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { ownedPets, activePetId, setActivePet } = usePetCollection();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.upgradeCard} onPress={() => {}}>
          <Text style={styles.upgradeTitle}>My Pets</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {ownedPets.map((p) => (
              <PetListCard
                key={p.id}
                pet={p}
                isActive={p.id === activePetId}
                onSelect={() => { setActivePet(p.id); onClose(); }}
              />
            ))}
          </ScrollView>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function PetHomeScreen({ onCatch }: { onCatch: () => void }) {
  const { ownedPets, activePetId } = usePetCollection();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSelect,  setShowSelect]  = useState(false);

  const activePet = ownedPets.find((p) => p.id === activePetId) ?? ownedPets[0];

  if (!activePet) {
    return (
      <View style={styles.screen}>
        <Text style={styles.emptyText}>No pets yet — go catch one!</Text>
        <Pressable style={styles.catchBtn} onPress={onCatch}>
          <Text style={styles.catchBtnText}>🎾 Catch a Pet</Text>
        </Pressable>
      </View>
    );
  }

  const rColor = RARITY_COLOR[activePet.rarity];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Active pet card */}
      <RarityCard rarity={activePet.rarity} style={styles.activePetCard}>
        <Text style={styles.activePetEmoji}>{activePet.emoji}</Text>
        <Text style={[styles.activePetName, { color: rColor }]}>{activePet.name}</Text>
        <Text style={styles.activePetRarity}>{RARITY_LABEL[activePet.rarity]}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{activePet.maxHp}</Text>
            <Text style={styles.statLbl}>HP</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{activePet.atk}</Text>
            <Text style={styles.statLbl}>ATK</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{activePet.spd}</Text>
            <Text style={styles.statLbl}>SPD</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: C.gold }]}>Lv {activePet.level}</Text>
            <Text style={styles.statLbl}>LEVEL</Text>
          </View>
        </View>

        {/* EXP bar */}
        <View style={styles.expRow}>
          <Text style={styles.expLabel}>
            EXP {activePet.exp} / {expToNextLevel(activePet.level)}
          </Text>
          <ExpBar pet={activePet} />
        </View>
      </RarityCard>

      <Text style={styles.sectionLabel}>Owned Pets · {ownedPets.length}</Text>

      {/* Collection preview */}
      {ownedPets.slice(0, 4).map((p) => (
        <PetListCard
          key={p.id}
          pet={p}
          isActive={p.id === activePetId}
          onSelect={() => setShowSelect(true)}
        />
      ))}
      {ownedPets.length > 4 && (
        <Text style={styles.morePets}>+{ownedPets.length - 4} more pets…</Text>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => setShowUpgrade(true)}>
          <Text style={styles.actionIcon}>🍖</Text>
          <Text style={styles.actionLabel}>Upgrade</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setShowSelect(true)}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={[styles.actionLabel, { color: C.textPrimary }]}>My Pets</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onCatch}>
          <Text style={styles.actionIcon}>🎾</Text>
          <Text style={styles.actionLabel}>Catch</Text>
        </Pressable>
      </View>

      <UpgradeModal pet={activePet} visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <SelectModal  visible={showSelect}  onClose={() => setShowSelect(false)} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  rarityBase: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },

  activePetCard: { padding: 20, alignItems: 'center', gap: 8 },
  activePetEmoji: { fontSize: 72 },
  activePetName:  { fontSize: 22, fontWeight: '700' },
  activePetRarity:{ fontSize: 13, color: C.textMuted, letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBox:  { alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 10, padding: 10, minWidth: 60 },
  statVal:  { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  statLbl:  { fontSize: 10, color: C.textMuted, marginTop: 2 },

  expRow:    { width: '100%', gap: 4 },
  expLabel:  { fontSize: 11, color: C.textMuted },
  expBarWrap:{ height: 6, backgroundColor: C.border, borderRadius: 3, width: '100%', overflow: 'hidden' },
  expBarFill:{ height: '100%', backgroundColor: C.gold, borderRadius: 3 },

  sectionLabel: { fontSize: 11, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  listEmoji: { fontSize: 28 },
  listName:  { fontSize: 14, fontWeight: '600' },
  listMeta:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  activeTag: { fontSize: 11, fontWeight: '600' },
  morePets:  { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnPrimary: { backgroundColor: '#2A2060', borderColor: '#5540BB' },
  actionIcon:  { fontSize: 24 },
  actionLabel: { fontSize: 12, color: C.textMuted },

  catchBtn: {
    backgroundColor: '#2A2060',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  catchBtnText: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyText:    { color: C.textMuted, fontSize: 15, marginBottom: 24 },

  // Modals
  backdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  upgradeCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  upgradeTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  upgradeSub:   { color: C.textMuted,   fontSize: 14, textAlign: 'center' },
  feedRow:      { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  feedBtn: {
    flex: 1,
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  feedBtnText: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  feedBtnCost: { color: C.textMuted,   fontSize: 11 },
  closeBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  closeBtnText: { color: C.textMuted, fontSize: 14 },
});
