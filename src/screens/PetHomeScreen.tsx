// ─────────────────────────────────────────────────────────────
//  PetHomeScreen.tsx
//  Main pet page: active pet display, owned pets list,
//  Upgrade / Select / Catch actions.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { usePetCollection } from '../context/PetCollectionContext';
import {
  expToMax,
  expToNextLevel,
  MAX_PET_LEVEL,
  PET_TEMPLATES,
} from '../engine/petBattleEngine';
import {
  RAINBOW_CYCLE,
  RARITY_COLOR,
  RARITY_LABEL,
  type OwnedPet,
  type PetRarity,
  type PetTemplate,
} from '../types/petCollection.types';

// ── Template image lookup (avoids stale AsyncStorage asset IDs) ──

function templateImage(templateId: string): number | undefined {
  return PET_TEMPLATES.find((t) => t.id === templateId)?.image;
}

// ── Rarity sort ───────────────────────────────────────────────

const RARITY_ORDER: Record<PetRarity, number> = {
  super_legendary: 0,
  legendary:       1,
  rare:            2,
};

function sortByRarity(pets: OwnedPet[]): OwnedPet[] {
  return [...pets].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
}

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
  const color   = RARITY_COLOR[pet.rarity];
  const isSuper = pet.rarity === 'super_legendary';

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isSuper) return;
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    ).start();
    return () => anim.stopAnimation();
  }, [isSuper]);

  const rainbowColor = anim.interpolate({
    inputRange:  RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });

  const nameColor   = isSuper ? rainbowColor : color;
  const borderColor = isActive ? (isSuper ? rainbowColor : color) : C.border;

  return (
    <Animated.View style={[styles.listCard, isActive && { borderWidth: 2 }, { borderColor }]}>
      <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onSelect}>
        {templateImage(pet.templateId)
          ? <Image source={templateImage(pet.templateId)!} style={styles.listImage} />
          : <Text style={styles.listEmoji}>{pet.emoji}</Text>
        }
        <View style={{ flex: 1 }}>
          <Animated.Text style={[styles.listName, { color: nameColor }]}>{pet.name}</Animated.Text>
          <Text style={styles.listMeta}>
            {RARITY_LABEL[pet.rarity]} · Lv {pet.level}
          </Text>
        </View>
        {isActive && <Animated.Text style={[styles.activeTag, { color: nameColor }]}>Active</Animated.Text>}
      </Pressable>
    </Animated.View>
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
  const { upgradePet, removePet } = usePetCollection();
  const needed = expToNextLevel(pet.level);
  const [confirmRelease, setConfirmRelease] = useState(false);

  function feed(amount: number) {
    upgradePet(pet.id, amount);
  }

  function handleRelease() {
    removePet(pet.id);
    setConfirmRelease(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Feed Pet</Text>
          <View style={{ alignItems: 'center' }}>
            {templateImage(pet.templateId)
              ? <Image source={templateImage(pet.templateId)!} style={styles.upgradePetImage} />
              : <Text style={{ fontSize: 40 }}>{pet.emoji}</Text>
            }
          </View>
          <Text style={styles.upgradeSub}>
            {pet.name} · Lv {pet.level}
          </Text>
          <Text style={styles.upgradeSub}>
            EXP  {pet.exp} / {needed}
          </Text>

          <View style={styles.feedRow}>
            {[10, 50, 100].map((amt) => (
              <Pressable key={amt} style={styles.feedBtn} onPress={() => feed(amt)} disabled={pet.level >= MAX_PET_LEVEL}>
                <Text style={styles.feedBtnText}>+{amt} EXP</Text>
                <Text style={styles.feedBtnCost}>📖 {amt}</Text>
              </Pressable>
            ))}
            {pet.level < MAX_PET_LEVEL ? (
              <Pressable style={styles.feedBtn} onPress={() => feed(expToMax(pet))}>
                <Text style={styles.feedBtnText}>⚡ Max</Text>
                <Text style={styles.feedBtnCost}>{expToMax(pet)} EXP</Text>
              </Pressable>
            ) : (
              <View style={[styles.feedBtn, { opacity: 0.5 }]}>
                <Text style={styles.feedBtnText}>✨ Max</Text>
                <Text style={styles.feedBtnCost}>Reached!</Text>
              </View>
            )}
          </View>

          {confirmRelease ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Release {pet.name}?</Text>
              <View style={styles.confirmBtns}>
                <Pressable style={styles.confirmYes} onPress={handleRelease}>
                  <Text style={styles.confirmYesText}>Yes, Release</Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmRelease(false)}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.releaseBtn} onPress={() => setConfirmRelease(true)}>
              <Text style={styles.releaseBtnText}>Release Pet</Text>
            </Pressable>
          )}

          <Pressable android_ripple={null} style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Pet gallery modal — all templates, owned vs locked ───────

const GALLERY_RARITY_ORDER: PetRarity[] = ['super_legendary', 'legendary', 'rare'];

function GalleryRow({
  template,
  owned,
}: {
  template: PetTemplate;
  owned: OwnedPet | undefined;
}) {
  const color   = RARITY_COLOR[template.rarity];
  const isOwned = !!owned;
  const isSuper = template.rarity === 'super_legendary';

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isSuper || !isOwned) return;
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    ).start();
    return () => anim.stopAnimation();
  }, [isSuper, isOwned]);

  const rainbowColor = anim.interpolate({
    inputRange:  RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });

  const nameColor   = isOwned ? (isSuper ? rainbowColor   : color) : C.textMuted;
  const borderColor = isOwned ? (isSuper ? rainbowColor   : color) : C.border;
  const badgeColor  = isSuper ? rainbowColor : color;

  return (
    <Animated.View style={[styles.galleryRow, { borderColor, opacity: isOwned ? 1 : 0.45 }]}>
      {isOwned && template.image
        ? <Image source={template.image} style={styles.galleryImage} />
        : <Text style={styles.galleryEmoji}>{isOwned ? template.emoji : '❓'}</Text>
      }
      <View style={{ flex: 1 }}>
        <Animated.Text style={[styles.galleryName, { color: nameColor }]}>
          {isOwned ? template.name : '??? Unknown'}
        </Animated.Text>
        <Text style={styles.galleryMeta}>
          {RARITY_LABEL[template.rarity]}
          {isOwned ? `  ·  Lv ${owned!.level}` : '  ·  Not caught yet'}
        </Text>
      </View>
      {isOwned
        ? <Animated.Text style={[styles.galleryBadge, { color: badgeColor }]}>Owned</Animated.Text>
        : <Text style={styles.galleryLock}>🔒</Text>
      }
    </Animated.View>
  );
}

function GalleryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { ownedPets } = usePetCollection();
  const ownedMap = new Map(ownedPets.map((p) => [p.templateId, p]));

  const sorted = [...PET_TEMPLATES].sort(
    (a, b) => GALLERY_RARITY_ORDER.indexOf(a.rarity) - GALLERY_RARITY_ORDER.indexOf(b.rarity),
  );

  const total  = PET_TEMPLATES.length;
  const caught = ownedMap.size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Tapping the dim area closes the modal */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Card — plain View so ScrollView gestures are never stolen */}
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Pet Gallery</Text>
          <Text style={styles.upgradeSub}>
            {caught} / {total} caught
          </Text>

          {/* Progress bar */}
          <View style={styles.galleryProgressWrap}>
            <View style={[styles.galleryProgressFill, { width: `${(caught / total) * 100}%` as any }]} />
          </View>

          <ScrollView
            style={{ maxHeight: 380 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {sorted.map((t) => (
              <GalleryRow key={t.id} template={t} owned={ownedMap.get(t.id)} />
            ))}
          </ScrollView>

          <Pressable
            android_ripple={null}
            style={styles.closeBtn}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function PetHomeScreen({ onCatch }: { onCatch: () => void }) {
  const { ownedPets, activePetId, setActivePet } = usePetCollection();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

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
    <View style={styles.screen}>
      {/* Active pet card — compact, fixed size */}
      <RarityCard rarity={activePet.rarity} style={styles.activePetCard}>
        <View style={styles.activePetRow}>
          {templateImage(activePet.templateId)
            ? <Image source={templateImage(activePet.templateId)!} style={styles.activePetImage} />
            : <Text style={styles.activePetEmoji}>{activePet.emoji}</Text>
          }
          <View style={styles.activePetInfo}>
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

      {/* Section label */}
      <Text style={styles.sectionLabel}>Owned Pets · {ownedPets.length}</Text>

      {/* Pet list — fills all remaining space, no outer scroll */}
      <FlatList
        style={styles.petList}
        contentContainerStyle={styles.petListContent}
        data={sortByRarity(ownedPets)}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <PetListCard
            pet={p}
            isActive={p.id === activePetId}
            onSelect={() => setActivePet(p.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={ownedPets.length > 4}
      />

      {/* Action buttons — pinned at bottom */}
      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => setShowUpgrade(true)}>
          <Text style={styles.actionIcon}>🍖</Text>
          <Text style={styles.actionLabel}>Upgrade</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => setShowGallery(true)}>
          <Text style={styles.actionIcon}>📖</Text>
          <Text style={styles.actionLabel}>Gallery</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onCatch}>
          <Text style={styles.actionIcon}>🎾</Text>
          <Text style={styles.actionLabel}>Catch</Text>
        </Pressable>
      </View>

      <UpgradeModal pet={activePet} visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <GalleryModal visible={showGallery} onClose={() => setShowGallery(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Screen — fixed, never scrolls ─────────────────────────
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 12,
    gap: 8,
  },

  rarityBase: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // ── Active pet card — horizontal layout with extra height for future animation ────
  activePetCard: { padding: 18, gap: 12, minHeight: 180 },
  activePetRow:  { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  activePetEmoji:{ fontSize: 72 },
  activePetImage:{ width: 72, height: 72 },
  activePetInfo: { flex: 1, gap: 2 },
  activePetName: { fontSize: 17, fontWeight: '700' },
  activePetRarity:{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 4 },

  statsRow: { flexDirection: 'row', gap: 6 },
  statBox:  { alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
  statVal:  { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  statLbl:  { fontSize: 9,  color: C.textMuted, marginTop: 1 },

  expRow:    { gap: 3 },
  expLabel:  { fontSize: 10, color: C.textMuted },
  expBarWrap:{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  expBarFill:{ height: '100%', backgroundColor: C.gold, borderRadius: 3 },

  // ── Section label ──────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Pet list — fills all remaining space ───────────────────
  petList:        { flex: 1 },
  petListContent: { gap: 6 },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  listEmoji: { fontSize: 24 },
  listImage: { width: 32, height: 32 },
  listName:  { fontSize: 13, fontWeight: '600' },
  listMeta:  { fontSize: 10, color: C.textMuted, marginTop: 1 },
  activeTag: { fontSize: 10, fontWeight: '600' },

  // ── Action buttons — pinned at bottom ─────────────────────
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnPrimary: { backgroundColor: '#2A2060', borderColor: '#5540BB' },
  actionIcon:  { fontSize: 22 },
  actionLabel: { fontSize: 11, color: C.textMuted },

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
  upgradePetImage: { width: 72, height: 72 },
  maxBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#2A2060', borderWidth: 1, borderColor: '#5540BB' },
  maxBtnText: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  releaseBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.red },
  releaseBtnText: { color: C.red, fontSize: 14 },
  confirmRow: { gap: 8 },
  confirmText: { color: C.textPrimary, fontSize: 14, textAlign: 'center' },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  confirmYes: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: C.red },
  confirmYesText: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },

  // ── Gallery ────────────────────────────────────────────────
  galleryProgressWrap: {
    height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden',
  },
  galleryProgressFill: {
    height: '100%', backgroundColor: C.gold, borderRadius: 3,
  },
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  galleryEmoji:  { fontSize: 26 },
  galleryImage:  { width: 36, height: 36 },
  galleryName:   { fontSize: 13, fontWeight: '600' },
  galleryMeta:   { fontSize: 10, color: C.textMuted, marginTop: 2 },
  galleryBadge:  { fontSize: 10, fontWeight: '700' },
  galleryLock:   { fontSize: 14 },
});
