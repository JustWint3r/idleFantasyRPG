// ─────────────────────────────────────────────────────────────
//  CharacterScreen.tsx
//  Fixed character panel on top, scrollable grid inventory below
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useGear } from '../context/GearContext';
import { usePlayer } from '../context/PlayerContext';
import { usePetCollection } from '../context/PetCollectionContext';
import { useHeroCollection } from '../context/HeroCollectionContext';
import { HERO_ROSTER } from '../data/heroRoster.data';
import {
  expToNextLevel,
  MAX_LEVEL,
  MAX_STARS,
  STAR_UP_GOLD,
  XP_PER_BOOK,
  type HeroState,
} from '../types/hero.types';
import {
  RARITY_COLOR as GEAR_RARITY_COLOR,
  RARITY_LABEL as GEAR_RARITY_LABEL,
  SLOT_ICON,
  SLOT_LABEL,
  SUPPORT_STONES,
  type GearItem,
  type GearSlot,
  type UpgradeResult,
} from '../types/gear.types';
import {
  RAINBOW_CYCLE,
  RARITY_COLOR as PET_RARITY_COLOR,
  RARITY_LABEL as PET_RARITY_LABEL,
  type OwnedPet,
} from '../types/petCollection.types';
import {
  attemptUpgrade,
  previewSuccessChance,
  previewUpgradeCost,
  calcLoadoutCp,
  calcLoadoutStats,
} from '../engine/gearEngine';
import { ITEM_TEMPLATES } from '../data/gearTemplates.data';
import { CURRENCY_META } from '../types/player.types';
import TalentScreen from './TalentScreen';

const { width: SW } = Dimensions.get('window');

const C = {
  bg: '#0F0E1A',
  surface: '#1A1830',
  surfaceHigh: '#242140',
  border: '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted: '#7B7699',
  gold: '#F5C842',
  green: '#4ADE80',
  red: '#F87171',
  purple: '#A78BFA',
  blue: '#60A5FA',
  orange: '#FB923C',
} as const;

const LEFT_SLOTS: GearSlot[] = ['weapon', 'armor', 'helmet'];
const RIGHT_SLOTS: GearSlot[] = ['ring', 'boots', 'necklace'];

const MOCK_HEROES = [
  { id: 'hero_001', name: 'Aria',   level: 42, image: require('../../assets/aria.png') },
  { id: 'hero_002', name: 'Kael',   level: 38, image: require('../../assets/aria.png') },
  { id: 'hero_003', name: 'Selene', level: 55, image: require('../../assets/selene.png') },
];

type TabKey = 'all' | 'gear' | 'pets' | 'heroes' | 'mats' | 'currencies';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gear', label: 'Gear' },
  { key: 'pets', label: 'Pets' },
  { key: 'heroes', label: 'Heroes' },
  { key: 'mats', label: 'Mats' },
  { key: 'currencies', label: 'Wallet' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ── Rainbow animation hook ────────────────────────────────────

function useRainbowBorder(active: boolean): Animated.AnimatedInterpolation<string> {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { anim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2500, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  return anim.interpolate({
    inputRange: RAINBOW_CYCLE.map((_, i) => i / (RAINBOW_CYCLE.length - 1)),
    outputRange: RAINBOW_CYCLE,
  });
}

// ── Gear slot button ──────────────────────────────────────────

function GearSlotBtn({ slot, item, onPress }: { slot: GearSlot; item?: GearItem; onPress: () => void }) {
  const borderColor = item ? GEAR_RARITY_COLOR[item.rarity] : C.border;
  return (
    <Pressable style={[styles.slotBtn, { borderColor }]} onPress={onPress}>
      <Text style={styles.slotIcon}>{SLOT_ICON[slot]}</Text>
      {item ? (
        <Text style={[styles.slotLevel, { color: GEAR_RARITY_COLOR[item.rarity] }]}>+{item.level}</Text>
      ) : (
        <Text style={styles.slotEmpty} numberOfLines={1}>{SLOT_LABEL[slot]}</Text>
      )}
    </Pressable>
  );
}

// ── Pet slot button (character panel) ────────────────────────

function PetSlotBtn({ pet, onPress }: { pet: OwnedPet | null; onPress: () => void }) {
  const isSuper = pet?.rarity === 'super_legendary';
  const staticColor = pet ? PET_RARITY_COLOR[pet.rarity] : C.border;
  const rainbowColor = useRainbowBorder(isSuper);
  const borderColor = isSuper ? rainbowColor : staticColor;
  return (
    <Animated.View style={[styles.slotBtn, { borderColor }]}>
      <Pressable style={styles.cellInner} onPress={onPress}>
        {pet?.image ? (
          <Image source={pet.image} style={styles.petSlotImage} resizeMode="contain" />
        ) : (
          <Text style={styles.slotIcon}>{pet ? pet.emoji : '🐾'}</Text>
        )}
        <Text style={[styles.slotEmpty, { color: pet ? staticColor : C.textMuted }]} numberOfLines={1}>
          {pet ? `Lv${pet.level}` : 'Pet'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Item grid cell ────────────────────────────────────────────

function ItemCell({ item, onPress }: { item: GearItem; onPress: () => void }) {
  const color = GEAR_RARITY_COLOR[item.rarity] ?? C.textMuted;
  return (
    <Pressable style={[styles.cell, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.cellIcon}>{SLOT_ICON[item.slot]}</Text>
      <Text style={[styles.cellRarity, { color }]}>{item.rarity.charAt(0).toUpperCase()}</Text>
      <Text style={styles.cellLevel}>+{item.level}</Text>
      {item.equippedTo && <View style={styles.equippedDot} />}
    </Pressable>
  );
}

function PetCell({ pet, isActive, onPress }: { pet: OwnedPet; isActive: boolean; onPress: () => void }) {
  const isSuper = pet.rarity === 'super_legendary';
  const staticColor = PET_RARITY_COLOR[pet.rarity] ?? C.textMuted;
  const rainbowColor = useRainbowBorder(isSuper);
  const borderColor: Animated.AnimatedInterpolation<string> | string = isSuper ? rainbowColor : staticColor;
  return (
    <Animated.View style={[styles.cell, { borderColor }]}>
      <Pressable style={styles.cellInner} onPress={onPress}>
        {pet.image ? (
          <Image source={pet.image} style={styles.petCellImage} resizeMode="contain" />
        ) : (
          <Text style={styles.cellIcon}>{pet.emoji}</Text>
        )}
        <Text style={[styles.cellRarity, { color: staticColor }]}>{isSuper ? 'SL' : pet.rarity.charAt(0).toUpperCase()}</Text>
        <Text style={styles.cellLevel}>Lv{pet.level}</Text>
        {isActive && <View style={styles.equippedDot} />}
      </Pressable>
    </Animated.View>
  );
}

// ── Hero card (inventory grid) ────────────────────────────────

function HeroCard({ heroState, onPress }: { heroState: HeroState; onPress: () => void }) {
  const template = HERO_ROSTER.find((t) => t.id === heroState.id);
  const isMaxLevel = heroState.level >= MAX_LEVEL;
  const expNeeded = expToNextLevel(heroState.level);
  const progress = isMaxLevel ? 1 : heroState.exp / expNeeded;
  const starStr = '★'.repeat(heroState.stars) + '☆'.repeat(Math.max(0, MAX_STARS - heroState.stars));

  return (
    <Pressable style={styles.heroCard} onPress={onPress}>
      <Image source={template?.image} style={styles.heroCardImage} resizeMode="contain" />
      <Text style={styles.heroCardName} numberOfLines={1}>{template?.name.split(' ')[0]}</Text>
      <Text style={styles.heroCardStars} numberOfLines={1}>{starStr}</Text>
      <Text style={styles.heroCardLevel}>Lv {heroState.level}</Text>
      {/* EXP bar */}
      <View style={styles.heroCardExpBg}>
        <View style={[styles.heroCardExpFill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>
    </Pressable>
  );
}

// ── Hero upgrade modal ────────────────────────────────────────

function HeroUpgradeModal({
  heroState,
  xpBooks,
  gold,
  onLevelUp,
  onStarUp,
  onClose,
}: {
  heroState: HeroState;
  xpBooks: number;
  gold: number;
  onLevelUp: (books: number) => void;
  onStarUp: () => void;
  onClose: () => void;
}) {
  const [bookInput, setBookInput] = useState(1);
  const template = HERO_ROSTER.find((t) => t.id === heroState.id);
  const isMaxLevel = heroState.level >= MAX_LEVEL;
  const isMaxStars = heroState.stars >= MAX_STARS;
  const expNeeded = expToNextLevel(heroState.level);
  const progress = isMaxLevel ? 1 : heroState.exp / expNeeded;
  const expGain = bookInput * XP_PER_BOOK;
  const starCost = isMaxStars ? 0 : (STAR_UP_GOLD[heroState.stars] ?? 0);
  const canAffordStar = gold >= starCost;
  const starStr = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, MAX_STARS - n));

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: C.purple + '55' }]}>
          <Image source={template?.image} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>{template?.name}</Text>
            <Text style={[styles.modalRarity, { color: C.purple }]}>
              {template?.class.charAt(0).toUpperCase()}{template?.class.slice(1)} · Lv {heroState.level}
            </Text>
          </View>
          <Text style={[styles.modalLevel, { color: C.gold }]}>{starStr(heroState.stars)}</Text>
        </View>

        {/* EXP bar */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: C.textMuted }}>EXP</Text>
            {isMaxLevel
              ? <Text style={{ fontSize: 11, color: C.gold }}>MAX LEVEL</Text>
              : <Text style={{ fontSize: 11, color: C.textMuted }}>{heroState.exp} / {expNeeded}</Text>}
          </View>
          <View style={styles.heroCardExpBg}>
            <View style={[styles.heroCardExpFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        </View>

        {/* Level up section */}
        {!isMaxLevel && (
          <View style={styles.heroUpgradeSection}>
            <Text style={styles.stonesLabel}>Use XP Books (📖 {xpBooks} available)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Pressable
                style={styles.heroQtyBtn}
                onPress={() => setBookInput(Math.max(1, bookInput - 1))}
              >
                <Text style={styles.heroQtyBtnText}>−</Text>
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.textPrimary }}>{bookInput}</Text>
                <Text style={{ fontSize: 10, color: C.textMuted }}>+{expGain} EXP</Text>
              </View>
              <Pressable
                style={styles.heroQtyBtn}
                onPress={() => setBookInput(Math.min(xpBooks, bookInput + 1))}
              >
                <Text style={styles.heroQtyBtnText}>+</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {[5, 10, 50].map((n) => (
                <Pressable key={n} style={[styles.heroQtyBtn, { flex: 1 }]} onPress={() => setBookInput(Math.min(xpBooks, n))}>
                  <Text style={[styles.heroQtyBtnText, { fontSize: 11 }]}>×{n}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.upgradeBtn, { marginTop: 6, opacity: xpBooks < bookInput ? 0.4 : 1 }]}
              onPress={() => { if (xpBooks >= bookInput) onLevelUp(bookInput); }}
              disabled={xpBooks < bookInput}
            >
              <Text style={styles.upgradeBtnText}>Use {bookInput} Book{bookInput > 1 ? 's' : ''}</Text>
            </Pressable>
          </View>
        )}

        {/* Star up section */}
        <View style={styles.heroUpgradeSection}>
          <Text style={styles.stonesLabel}>Star Up</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 18, letterSpacing: 2, color: C.gold }}>{starStr(heroState.stars)}</Text>
            {!isMaxStars && (
              <Text style={{ fontSize: 12, color: C.gold }}>🪙 {starCost.toLocaleString()}</Text>
            )}
          </View>
          {isMaxStars ? (
            <Text style={{ fontSize: 12, color: C.gold, textAlign: 'center', marginTop: 6 }}>MAX STARS ✦</Text>
          ) : (
            <Pressable
              style={[styles.upgradeBtn, { marginTop: 8, opacity: canAffordStar ? 1 : 0.4 }]}
              onPress={() => { if (canAffordStar) onStarUp(); }}
              disabled={!canAffordStar}
            >
              <Text style={styles.upgradeBtnText}>
                {canAffordStar ? `Star Up → ${'★'.repeat(heroState.stars + 1)}` : 'Not enough Gold'}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Upgrade modal ─────────────────────────────────────────────

function UpgradeModal({
  item,
  upgradeScrolls,
  supportStones,
  onUpgrade,
  onClose,
}: {
  item: GearItem;
  upgradeScrolls: number;
  supportStones: Record<string, number>;
  onUpgrade: (result: UpgradeResult, stoneId?: string) => void;
  onClose: () => void;
}) {
  const [selectedStoneId, setSelectedStoneId] = useState<string | undefined>();
  const [lastResult, setLastResult] = useState<UpgradeResult | null>(null);

  const isMaxLevel = item.level >= 25;
  const stoneBonus = selectedStoneId
    ? (SUPPORT_STONES.find((s) => s.id === selectedStoneId)?.bonusPercent ?? 0)
    : 0;
  const cost = previewUpgradeCost(item);
  const chance = previewSuccessChance(item, stoneBonus);
  const rColor = GEAR_RARITY_COLOR[item.rarity];
  const template = ITEM_TEMPLATES[item.templateId];

  function handleUpgrade() {
    const result = attemptUpgrade(item, { supportStoneBonus: stoneBonus });
    setLastResult(result);
    onUpgrade(result, selectedStoneId);
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={[styles.modalHeader, { borderBottomColor: rColor + '55' }]}>
          <Text style={styles.modalIconText}>{SLOT_ICON[item.slot]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>{template?.name ?? item.templateId}</Text>
            <Text style={[styles.modalRarity, { color: rColor }]}>{GEAR_RARITY_LABEL[item.rarity]} · Lv {item.level}{!isMaxLevel ? ` → ${item.level + 1}` : ' MAX'}</Text>
          </View>
          <Text style={[styles.modalLevel, { color: C.gold }]}>+{item.level}</Text>
        </View>

        {lastResult && (
          <View style={[styles.upgradeResult, { borderColor: lastResult.outcome !== 'fail' ? C.green : C.red }]}>
            <Text style={[styles.upgradeResultText, { color: lastResult.outcome !== 'fail' ? C.green : C.red }]}>
              {lastResult.outcome === 'guaranteed' ? '✓ Upgraded!'
                : lastResult.outcome === 'success' ? `✓ Success! (${lastResult.chanceRolled}%)`
                : `✗ Failed (needed ≤${lastResult.chanceFinal}%, rolled ${lastResult.chanceRolled}%)`}
            </Text>
          </View>
        )}

        {!isMaxLevel && (
          <>
            <View style={styles.chanceRow}>
              <Text style={styles.chanceLabel}>Success rate</Text>
              <Text style={[styles.chanceValue, { color: chance >= 80 ? C.green : chance >= 40 ? C.gold : C.red }]}>
                {chance}%
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text style={styles.costChip}>🪙 {fmt(cost.gold)}</Text>
              <Text style={styles.costChip}>⚙️ {cost.mats}</Text>
              {cost.scrolls > 0 && <Text style={styles.costChip}>📜 {cost.scrolls}</Text>}
            </View>

            {item.level >= 5 && (
              <View style={styles.stonesRow}>
                <Text style={styles.stonesLabel}>Support Stone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <View style={styles.stonesOptions}>
                    <Pressable
                      style={[styles.stoneBtn, !selectedStoneId && styles.stoneBtnActive]}
                      onPress={() => setSelectedStoneId(undefined)}
                    >
                      <Text style={styles.stoneBtnText}>None</Text>
                    </Pressable>
                    {SUPPORT_STONES.map((s) => {
                      const count = supportStones[s.id] ?? 0;
                      return (
                        <Pressable
                          key={s.id}
                          style={[styles.stoneBtn, selectedStoneId === s.id && styles.stoneBtnActive, count === 0 && { opacity: 0.35 }]}
                          onPress={() => count > 0 && setSelectedStoneId(s.id)}
                          disabled={count === 0}
                        >
                          <Text style={styles.stoneBtnText}>{s.label}</Text>
                          <Text style={styles.stoneBtnCount}>×{count}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            <Pressable style={styles.upgradeBtn} onPress={handleUpgrade}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Inspect modal ─────────────────────────────────────────────

function InspectModal({ item, heroId, onEquip, onUpgrade, onClose }: {
  item: GearItem;
  heroId: string;
  onEquip: () => void;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  const rColor = GEAR_RARITY_COLOR[item.rarity];
  const template = ITEM_TEMPLATES[item.templateId];
  const isEquipped = item.equippedTo === heroId;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={[styles.modalHeader, { borderBottomColor: rColor + '55' }]}>
          <Text style={styles.modalIconText}>{SLOT_ICON[item.slot]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>{template?.name ?? item.templateId.replace(/_/g, ' ')}</Text>
            <Text style={[styles.modalRarity, { color: rColor }]}>{GEAR_RARITY_LABEL[item.rarity]} · {SLOT_LABEL[item.slot]}</Text>
          </View>
          <Text style={[styles.modalLevel, { color: C.gold }]}>+{item.level}</Text>
        </View>
        <View style={styles.statsBlock}>
          {item.stats.atk > 0 && <StatRow label="ATK" value={`${Math.round(item.stats.atk)}`} />}
          {item.stats.def > 0 && <StatRow label="DEF" value={`${Math.round(item.stats.def)}`} />}
          {item.stats.hp > 0 && <StatRow label="HP" value={fmt(item.stats.hp)} />}
          {item.stats.crit > 0 && <StatRow label="CRIT" value={`${item.stats.crit}%`} />}
          {item.stats.critDmg > 0 && <StatRow label="CRIT DMG" value={`${item.stats.critDmg}%`} />}
          <StatRow label="CP" value={String(item.cp)} highlight />
        </View>
        <View style={styles.inspectBtnRow}>
          <Pressable style={[styles.equipBtn, { flex: 1 }, isEquipped && styles.unequipBtn]} onPress={onEquip}>
            <Text style={[styles.equipBtnText, isEquipped && { color: C.red }]}>{isEquipped ? 'Unequip' : 'Equip'}</Text>
          </Pressable>
          {item.level < 25 && (
            <Pressable style={[styles.upgradeBtn, { flex: 1 }]} onPress={onUpgrade}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </Pressable>
          )}
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statL}>{label}</Text>
      <Text style={[styles.statR, highlight && { color: C.gold }]}>{value}</Text>
    </View>
  );
}

// ── Pet inspect modal ─────────────────────────────────────────

function PetInspectModal({
  pet,
  isActive,
  onEquip,
  onClose,
}: {
  pet: OwnedPet;
  isActive: boolean;
  onEquip: () => void;
  onClose: () => void;
}) {
  const rColor = PET_RARITY_COLOR[pet.rarity];
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={[styles.modalHeader, { borderBottomColor: rColor + '55' }]}>
          {pet.image ? (
            <Image source={pet.image} style={styles.petModalImage} resizeMode="contain" />
          ) : (
            <Text style={styles.modalIconText}>{pet.emoji}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>{pet.name}</Text>
            <Text style={[styles.modalRarity, { color: rColor }]}>{PET_RARITY_LABEL[pet.rarity]} · Pet</Text>
          </View>
          <Text style={[styles.modalLevel, { color: C.gold }]}>Lv{pet.level}</Text>
        </View>
        <View style={styles.statsBlock}>
          <StatRow label="ATK" value={String(pet.atk)} />
          <StatRow label="HP" value={String(pet.maxHp)} />
          <StatRow label="SPD" value={String(pet.spd)} />
        </View>
        <Pressable
          style={[styles.equipBtn, isActive && styles.unequipBtn]}
          onPress={() => { onEquip(); onClose(); }}
        >
          <Text style={[styles.equipBtnText, isActive && { color: C.red }]}>
            {isActive ? 'Unequip Pet' : 'Equip Pet'}
          </Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function CharacterScreen() {
  const { gearState, equip, unequip, upgrade, applyUpgrade } = useGear();
  const { currencies, spendCurrencies } = usePlayer();
  const { ownedPets, heroPets, equipPetToHero, unequipPetFromHero } = usePetCollection();
  const { heroes, addExp, starUp: starUpHero } = useHeroCollection();
  const [inspecting, setInspecting] = useState<GearItem | null>(null);
  const [upgrading, setUpgrading] = useState<GearItem | null>(null);
  const [inspectingPet, setInspectingPet] = useState<OwnedPet | null>(null);
  const [upgradingHero, setUpgradingHero] = useState<HeroState | null>(null);
  const [showTalent, setShowTalent] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [heroIndex, setHeroIndex] = useState(0);

  const hero = MOCK_HEROES[heroIndex];
  const loadout = gearState.loadouts[hero.id];
  const gear = loadout?.gear ?? {};
  const totalCp = calcLoadoutCp(gearState, hero.id);
  const totalStats = calcLoadoutStats(gearState, hero.id);

  const heroPetId = heroPets[hero.id] ?? null;
  const activePet = ownedPets.find((p) => p.id === heroPetId) ?? null;
  const allItems = gearState.items;
  const filteredItems = activeTab === 'all' || activeTab === 'gear' ? allItems : [];
  const filteredPets = activeTab === 'all' || activeTab === 'pets' ? ownedPets : [];
  const filteredHeroes = activeTab === 'heroes' ? heroes : [];

  function openSlot(slot: GearSlot) {
    const item = gear[slot as keyof typeof gear];
    if (item) {
      const fresh = gearState.items.find((i) => i.id === item.id);
      if (fresh) setInspecting(fresh);
    }
  }

  function handleEquip() {
    if (!inspecting) return;
    if (inspecting.equippedTo === hero.id) {
      unequip(inspecting.id, hero.id);
    } else {
      equip(inspecting.id, hero.id);
    }
    setInspecting(null);
  }

  function handleHeroSwipe(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / PORTRAIT_W);
    if (idx >= 0 && idx < MOCK_HEROES.length) setHeroIndex(idx);
  }

  const currentHeroState = heroes.find((h) => h.id === hero.id);

  const gridData: ({ type: 'item'; data: GearItem } | { type: 'pet'; data: OwnedPet })[] = [
    ...filteredItems.map((i) => ({ type: 'item' as const, data: i })),
    ...filteredPets.map((p) => ({ type: 'pet' as const, data: p })),
  ];

  return (
    <View style={styles.screen}>

      {/* ── FIXED top: character panel ── */}
      <View style={styles.fixedTop}>
        {/* CP row */}
        <View style={styles.cpRow}>
          <Text style={styles.cpValue}>{totalCp.toLocaleString()}</Text>
          <Text style={styles.cpLabel}> Combat Power</Text>
        </View>

        {/* Character + gear */}
        <View style={styles.characterPanel}>
          <View style={styles.gearColLeft}>
            {LEFT_SLOTS.map((slot) => (
              <GearSlotBtn key={slot} slot={slot} item={gear[slot as keyof typeof gear]} onPress={() => openSlot(slot)} />
            ))}
            <PetSlotBtn pet={activePet} onPress={() => setActiveTab('pets')} />
          </View>

          {/* Swipeable hero portrait */}
          <View style={styles.centreCol}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroScroll}
              onMomentumScrollEnd={handleHeroSwipe}
            >
              {MOCK_HEROES.map((h) => (
                <View key={h.id} style={styles.characterPortrait}>
                  <Image source={h.image} style={styles.portraitImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
            <Text style={styles.portraitName}>{hero.name}</Text>
            <Text style={styles.portraitLevel}>Lv {currentHeroState?.level ?? hero.level}</Text>
            {/* Dot indicators */}
            <View style={styles.heroDots}>
              {MOCK_HEROES.map((_, i) => (
                <View key={i} style={[styles.heroDot, i === heroIndex && styles.heroDotActive]} />
              ))}
            </View>
          </View>

          <View style={styles.gearColRight}>
            {RIGHT_SLOTS.map((slot) => (
              <GearSlotBtn key={slot} slot={slot} item={gear[slot as keyof typeof gear]} onPress={() => openSlot(slot)} />
            ))}
            <Pressable style={styles.slotBtn} onPress={() => setShowTalent(true)}>
              <Text style={styles.slotIcon}>🌟</Text>
              <Text style={styles.slotEmpty}>Talent</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          {totalStats.atk > 0 && <Text style={styles.statChip}>ATK {fmt(totalStats.atk)}</Text>}
          {totalStats.def > 0 && <Text style={styles.statChip}>DEF {fmt(totalStats.def)}</Text>}
          {totalStats.hp > 0 && <Text style={styles.statChip}>HP {fmt(totalStats.hp)}</Text>}
          {totalStats.crit > 0 && <Text style={styles.statChip}>CRIT {totalStats.crit}%</Text>}
          {totalStats.critDmg > 0 && <Text style={styles.statChip}>CDMG {totalStats.critDmg}%</Text>}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── SCROLLABLE inventory grid ── */}
      {activeTab === 'heroes' ? (
        <FlatList
          key="heroes-grid"
          data={filteredHeroes}
          keyExtractor={(h) => h.id}
          numColumns={3}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item: h }) => (
            <HeroCard heroState={h} onPress={() => setUpgradingHero(h)} />
          )}
        />
      ) : activeTab === 'currencies' ? (
        <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent}>
          {CURRENCY_META.map((m) => (
            <View key={m.key} style={styles.currRow}>
              <Text style={styles.currRowIcon}>{m.icon}</Text>
              <Text style={styles.currRowLabel}>{m.label}</Text>
              <Text style={[styles.currRowVal, { color: m.color }]}>{fmt(currencies[m.key])}</Text>
            </View>
          ))}
        </ScrollView>
      ) : activeTab === 'mats' ? (
        <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent}>
          {[
            { label: 'Craft Materials', icon: '⚙️', val: currencies.craftMats, color: C.orange },
            { label: 'XP Books', icon: '📖', val: currencies.xpBooks, color: C.blue },
            { label: 'Upgrade Scrolls', icon: '📋', val: currencies.upgradeScrolls, color: '#34D399' },
            { label: '+10% Stone', icon: '🔮', val: currencies.stone10, color: '#C4B5FD' },
            { label: '+20% Stone', icon: '🔮', val: currencies.stone20, color: '#8B5CF6' },
            { label: '+30% Stone', icon: '🔮', val: currencies.stone30, color: '#6D28D9' },
          ].map((r) => (
            <View key={r.label} style={styles.currRow}>
              <Text style={styles.currRowIcon}>{r.icon}</Text>
              <Text style={styles.currRowLabel}>{r.label}</Text>
              <Text style={[styles.currRowVal, { color: r.color }]}>{r.val}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          key="items-grid"
          data={gridData}
          keyExtractor={(r) => r.data.id}
          numColumns={4}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySub}>Farm zones and dungeons to collect gear</Text>
            </View>
          }
          renderItem={({ item: row }) =>
            row.type === 'item' ? (
              <ItemCell item={row.data as GearItem} onPress={() => setInspecting(row.data as GearItem)} />
            ) : (
              <PetCell
                pet={row.data as OwnedPet}
                isActive={(row.data as OwnedPet).id === heroPetId}
                onPress={() => setInspectingPet(row.data as OwnedPet)}
              />
            )
          }
        />
      )}

      {/* Gear inspect modal */}
      {inspecting && (
        <Modal transparent animationType="fade">
          <InspectModal
            item={inspecting}
            heroId={hero.id}
            onEquip={handleEquip}
            onUpgrade={() => { setUpgrading(inspecting); setInspecting(null); }}
            onClose={() => setInspecting(null)}
          />
        </Modal>
      )}

      {/* Upgrade modal */}
      {upgrading && (
        <Modal transparent animationType="slide">
          <UpgradeModal
            item={upgrading}
            upgradeScrolls={gearState.upgradeScrolls}
            supportStones={gearState.supportStones}
            onUpgrade={(result, stoneId) => {
              applyUpgrade(result, stoneId);
              // use the updated item from the result directly
              setUpgrading({ ...result.item });
            }}
            onClose={() => setUpgrading(null)}
          />
        </Modal>
      )}

      {/* Pet inspect modal */}
      {inspectingPet && (
        <Modal transparent animationType="fade">
          <PetInspectModal
            pet={inspectingPet}
            isActive={inspectingPet.id === heroPetId}
            onEquip={() => {
              if (inspectingPet.id === heroPetId) {
                unequipPetFromHero(hero.id);
              } else {
                equipPetToHero(hero.id, inspectingPet.id);
              }
            }}
            onClose={() => setInspectingPet(null)}
          />
        </Modal>
      )}

      {/* Hero upgrade modal */}
      {upgradingHero && (
        <Modal transparent animationType="slide">
          <HeroUpgradeModal
            heroState={upgradingHero}
            xpBooks={currencies.xpBooks}
            gold={currencies.gold}
            onLevelUp={(books) => {
              spendCurrencies({ xpBooks: books });
              addExp(upgradingHero.id, books * XP_PER_BOOK);
              setUpgradingHero((prev) => {
                if (!prev) return prev;
                const updated = heroes.find((h) => h.id === prev.id);
                return updated ?? prev;
              });
            }}
            onStarUp={() => {
              const cost = STAR_UP_GOLD[upgradingHero.stars] ?? 0;
              if (spendCurrencies({ gold: cost })) {
                starUpHero(upgradingHero.id);
                setUpgradingHero((prev) => {
                  if (!prev) return prev;
                  const updated = heroes.find((h) => h.id === prev.id);
                  return updated ?? prev;
                });
              }
            }}
            onClose={() => setUpgradingHero(null)}
          />
        </Modal>
      )}

      {/* Talent modal */}
      {showTalent && (
        <Modal transparent animationType="slide">
          <View style={styles.talentOverlay}>
            <View style={styles.talentSheet}>
              <View style={styles.talentSheetHeader}>
                <Text style={styles.talentSheetTitle}>Talent Tree</Text>
                <Pressable onPress={() => setShowTalent(false)}>
                  <Text style={styles.talentClose}>✕</Text>
                </Pressable>
              </View>
              <TalentScreen />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const SLOT_SIZE = 62;
const PORTRAIT_W = 240;
const PORTRAIT_H = 280;
const CELL_SIZE = (SW - 16 - 12) / 4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Fixed top section
  fixedTop: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  cpRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cpValue: { fontSize: 26, fontWeight: '700', color: C.gold },
  cpLabel: { fontSize: 13, color: C.textMuted },

  characterPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  gearColLeft: { gap: 8, alignItems: 'center' },
  gearColRight: { gap: 8, alignItems: 'center' },
  centreCol: { alignItems: 'center', gap: 4 },

  slotBtn: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    backgroundColor: C.surfaceHigh,
    borderRadius: SLOT_SIZE / 2,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotIcon: { fontSize: 20 },
  slotLevel: { fontSize: 9, fontWeight: '700' },
  slotEmpty: { fontSize: 8, color: C.textMuted, textAlign: 'center' },

  heroScroll: { width: PORTRAIT_W, height: PORTRAIT_H },
  characterPortrait: {
    width: PORTRAIT_W,
    height: PORTRAIT_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: { width: PORTRAIT_W, height: PORTRAIT_H },
  portraitName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  portraitLevel: { fontSize: 11, color: C.textMuted },
  heroDots: { flexDirection: 'row', gap: 5, marginTop: 2 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.border },
  heroDotActive: { backgroundColor: C.gold, width: 14 },

  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statChip: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    color: C.textMuted,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.textPrimary },
  tabText: { fontSize: 12, color: C.textMuted },
  tabTextActive: { color: C.textPrimary, fontWeight: '500' },

  // Grid
  grid: { flex: 1 },
  gridContent: { padding: 4, gap: 4 },

  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 3,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
  },
  cellInner: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellIcon: { fontSize: 22 },
  petCellImage: { width: 38, height: 38 },
  petSlotImage: { width: 42, height: 42 },
  petModalImage: { width: 48, height: 48 },
  cellRarity: { fontSize: 9, fontWeight: '700' },
  cellLevel: { fontSize: 9, color: C.textMuted },
  equippedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },

  emptyGrid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 6 },
  emptyText: { fontSize: 15, color: C.textMuted },
  emptySub: { fontSize: 12, color: C.textMuted, opacity: 0.6, textAlign: 'center' },

  // Hero card (3-column grid)
  heroCard: {
    flex: 1,
    margin: 4,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.purple + '66',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 3,
  },
  heroCardImage: { width: 64, height: 64, borderRadius: 8 },
  heroCardName: { fontSize: 11, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
  heroCardStars: { fontSize: 9, color: C.gold, letterSpacing: 1 },
  heroCardLevel: { fontSize: 10, color: C.textMuted },
  heroCardExpBg: {
    width: '90%', height: 4, borderRadius: 2,
    backgroundColor: C.border, overflow: 'hidden',
  },
  heroCardExpFill: { height: 4, borderRadius: 2, backgroundColor: C.purple },

  // Hero upgrade modal sections
  heroUpgradeSection: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  heroQtyBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroQtyBtnText: { fontSize: 18, color: C.textPrimary, fontWeight: '600' },

  // Currency wallet rows
  currRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    gap: 12,
  },
  currRowIcon: { fontSize: 22 },
  currRowLabel: { flex: 1, fontSize: 14, color: C.textMuted },
  currRowVal: { fontSize: 16, fontWeight: '600' },

  // Inspect modal
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  modalIconText: { fontSize: 32 },
  modalName: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  modalRarity: { fontSize: 12, marginTop: 2 },
  modalLevel: { fontSize: 22, fontWeight: '700' },
  statsBlock: { backgroundColor: C.surfaceHigh, borderRadius: 10, padding: 12, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statL: { fontSize: 13, color: C.textMuted },
  statR: { fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  equipBtn: { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  unequipBtn: { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.red },
  equipBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
  closeBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  closeBtnText: { fontSize: 14, color: C.textMuted },

  // Talent modal
  talentOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  talentSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  talentSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  talentSheetTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  talentClose: { fontSize: 18, color: C.textMuted, padding: 4 },

  // Inspect + Upgrade shared
  inspectBtnRow: { flexDirection: 'row', gap: 8 },
  upgradeBtn: { backgroundColor: '#1A3A2A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.green },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: C.green },

  // Upgrade modal extras
  upgradeResult: { borderRadius: 8, borderWidth: 1, padding: 10, alignItems: 'center' },
  upgradeResultText: { fontSize: 13, fontWeight: '600' },
  chanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chanceLabel: { fontSize: 13, color: C.textMuted },
  chanceValue: { fontSize: 15, fontWeight: '700' },
  costRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  costChip: { backgroundColor: C.surfaceHigh, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, color: C.textMuted },
  stonesRow: { gap: 4 },
  stonesLabel: { fontSize: 12, color: C.textMuted },
  stonesOptions: { flexDirection: 'row', gap: 6 },
  stoneBtn: { backgroundColor: C.surfaceHigh, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  stoneBtnActive: { borderColor: C.gold },
  stoneBtnText: { fontSize: 11, color: C.textPrimary },
  stoneBtnCount: { fontSize: 10, color: C.textMuted },
});
