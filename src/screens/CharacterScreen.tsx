// ─────────────────────────────────────────────────────────────
//  CharacterScreen.tsx
//  Fixed character panel on top, scrollable grid inventory below
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
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
import {
  RARITY_COLOR as GEAR_RARITY_COLOR,
  RARITY_LABEL as GEAR_RARITY_LABEL,
  SLOT_ICON,
  SLOT_LABEL,
  type GearItem,
  type GearSlot,
} from '../types/gear.types';
import {
  RARITY_COLOR as PET_RARITY_COLOR,
  RARITY_LABEL as PET_RARITY_LABEL,
  type OwnedPet,
} from '../types/petCollection.types';
import { calcLoadoutCp, calcLoadoutStats } from '../engine/gearEngine';
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
  { id: 'hero_003', name: 'Selene', level: 55, image: require('../../assets/aria.png') },
];

type TabKey = 'all' | 'gear' | 'pets' | 'mats' | 'currencies';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gear', label: 'Gear' },
  { key: 'pets', label: 'Pets' },
  { key: 'mats', label: 'Mats' },
  { key: 'currencies', label: 'Wallet' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
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
  const color = PET_RARITY_COLOR[pet.rarity] ?? C.textMuted;
  return (
    <Pressable style={[styles.cell, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.cellIcon}>{pet.emoji}</Text>
      <Text style={[styles.cellRarity, { color }]}>{pet.rarity === 'super_legendary' ? 'SL' : pet.rarity.charAt(0).toUpperCase()}</Text>
      <Text style={styles.cellLevel}>Lv{pet.level}</Text>
      {isActive && <View style={styles.equippedDot} />}
    </Pressable>
  );
}

// ── Inspect modal ─────────────────────────────────────────────

function InspectModal({ item, heroId, onEquip, onClose }: {
  item: GearItem;
  heroId: string;
  onEquip: () => void;
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
        <Pressable style={[styles.equipBtn, isEquipped && styles.unequipBtn]} onPress={onEquip}>
          <Text style={[styles.equipBtnText, isEquipped && { color: C.red }]}>{isEquipped ? 'Unequip' : 'Equip'}</Text>
        </Pressable>
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
          <Text style={styles.modalIconText}>{pet.emoji}</Text>
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
  const { gearState, equip, unequip } = useGear();
  const { currencies } = usePlayer();
  const { ownedPets, heroPets, equipPetToHero, unequipPetFromHero } = usePetCollection();
  const [inspecting, setInspecting] = useState<GearItem | null>(null);
  const [inspectingPet, setInspectingPet] = useState<OwnedPet | null>(null);
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
  const petSlotColor = activePet ? PET_RARITY_COLOR[activePet.rarity] : C.border;

  const allItems = gearState.items;
  const filteredItems = activeTab === 'all' || activeTab === 'gear' ? allItems : [];
  const filteredPets = activeTab === 'all' || activeTab === 'pets' ? ownedPets : [];

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
            <Pressable style={[styles.slotBtn, { borderColor: petSlotColor }]} onPress={() => setActiveTab('pets')}>
              <Text style={styles.slotIcon}>{activePet ? activePet.emoji : '🐾'}</Text>
              <Text style={[styles.slotEmpty, activePet && { color: petSlotColor }]} numberOfLines={1}>
                {activePet ? `Lv${activePet.level}` : 'Pet'}
              </Text>
            </Pressable>
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
            <Text style={styles.portraitLevel}>Lv {hero.level}</Text>
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
      {activeTab === 'currencies' ? (
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
          <InspectModal item={inspecting} heroId={hero.id} onEquip={handleEquip} onClose={() => setInspecting(null)} />
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
  cellIcon: { fontSize: 22 },
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
});
