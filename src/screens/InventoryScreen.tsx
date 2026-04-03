// ─────────────────────────────────────────────────────────────
//  InventoryScreen.tsx
//  Gacha-style inventory: hero loadout at top (swipeable),
//  currency bar, tabbed grid of all owned items.
// ─────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useGear } from '../context/GearContext';
import { usePlayer } from '../context/PlayerContext';
import {
  GEAR_SLOTS,
  RARITY_COLOR,
  RARITY_LABEL,
  SLOT_ICON,
  SLOT_LABEL,
  type GearItem,
  type GearSlot,
  type Pet,
} from '../types/gear.types';
import { CURRENCY_META } from '../types/player.types';
import { calcItemStats } from '../engine/gearEngine';
import { ITEM_TEMPLATES } from '../data/gearTemplates.data';

const { width: SW } = Dimensions.get('window');

// ── Colours ───────────────────────────────────────────────────

const C = {
  bg: '#0F0E1A',
  surface: '#1A1830',
  surfaceHigh: '#242140',
  border: '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted: '#7B7699',
  gold: '#F5C842',
  green: '#4ADE80',
  purple: '#A78BFA',
  blue: '#60A5FA',
  orange: '#FB923C',
  red: '#F87171',
} as const;

// ── Mock heroes (replace with real roster later) ──────────────

const HEROES = [
  {
    id: 'hero_001',
    name: 'Aria the Swift',
    level: 42,
    stars: 3,
    combatPower: 3800,
    initial: 'A',
    color: '#A78BFA',
  },
  {
    id: 'hero_002',
    name: 'Kael Ironforge',
    level: 28,
    stars: 2,
    combatPower: 2100,
    initial: 'K',
    color: '#60A5FA',
  },
  {
    id: 'hero_003',
    name: 'Seraphine',
    level: 15,
    stars: 1,
    combatPower: 900,
    initial: 'S',
    color: '#F87171',
  },
];

type TabKey = 'all' | 'gear' | 'pets' | 'mats' | 'currencies';

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}

function starsLabel(n: number) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 6 - n));
}

// ── Currency bar ──────────────────────────────────────────────

function CurrencyBar() {
  const { currencies } = usePlayer();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.currBar}
      contentContainerStyle={styles.currBarContent}
    >
      {CURRENCY_META.map((m) => (
        <View key={m.key} style={styles.currChip}>
          <Text style={styles.currIcon}>{m.icon}</Text>
          <Text style={[styles.currVal, { color: m.color }]}>
            {fmt(currencies[m.key])}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Hero loadout card ─────────────────────────────────────────

function HeroLoadoutCard({
  hero,
  loadout,
  items,
  onSlotPress,
}: {
  hero: (typeof HEROES)[0];
  loadout: Record<string, GearItem | undefined>;
  items: GearItem[];
  onSlotPress: (slot: GearSlot) => void;
}) {
  const gearSlots = GEAR_SLOTS.filter((s) => s !== 'pet') as GearSlot[];

  return (
    <View style={styles.heroCard}>
      {/* Hero avatar */}
      <View style={styles.heroAvatarWrap}>
        <View
          style={[
            styles.heroAvatar,
            {
              borderColor: hero.color + '88',
              backgroundColor: hero.color + '22',
            },
          ]}
        >
          <Text style={[styles.heroInitial, { color: hero.color }]}>
            {hero.initial}
          </Text>
        </View>
        <Text style={styles.heroName}>{hero.name}</Text>
        <Text style={styles.heroStars}>{starsLabel(hero.stars)}</Text>
        <Text style={styles.heroLevel}>Lv {hero.level}</Text>
      </View>

      {/* Gear slots arranged around hero (3 left, 3 right, 1 bottom) */}
      <View style={styles.slotsWrap}>
        {/* Left column */}
        <View style={styles.slotsCol}>
          {gearSlots.slice(0, 3).map((slot) => {
            const item = loadout[slot];
            return (
              <Pressable
                key={slot}
                style={[
                  styles.slotBtn,
                  item && {
                    borderColor: RARITY_COLOR[item.rarity],
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => onSlotPress(slot)}
              >
                <Text style={styles.slotEmoji}>{SLOT_ICON[slot]}</Text>
                {item && (
                  <Text
                    style={[
                      styles.slotLv,
                      { color: RARITY_COLOR[item.rarity] },
                    ]}
                  >
                    +{item.level}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Centre avatar */}
        <View style={styles.heroCentreWrap}>
          <View style={[styles.heroCentre, { borderColor: hero.color + '55' }]}>
            <Text style={[styles.heroCentreText, { color: hero.color }]}>
              {hero.initial}
            </Text>
          </View>
        </View>

        {/* Right column */}
        <View style={styles.slotsCol}>
          {gearSlots.slice(3, 6).map((slot) => {
            const item = loadout[slot];
            return (
              <Pressable
                key={slot}
                style={[
                  styles.slotBtn,
                  item && {
                    borderColor: RARITY_COLOR[item.rarity],
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => onSlotPress(slot)}
              >
                <Text style={styles.slotEmoji}>{SLOT_ICON[slot]}</Text>
                {item && (
                  <Text
                    style={[
                      styles.slotLv,
                      { color: RARITY_COLOR[item.rarity] },
                    ]}
                  >
                    +{item.level}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bottom slot (necklace) */}
      <View style={styles.bottomSlotRow}>
        {gearSlots.slice(6).map((slot) => {
          const item = loadout[slot];
          return (
            <Pressable
              key={slot}
              style={[
                styles.slotBtn,
                item && {
                  borderColor: RARITY_COLOR[item.rarity],
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => onSlotPress(slot)}
            >
              <Text style={styles.slotEmoji}>{SLOT_ICON[slot]}</Text>
              {item && (
                <Text
                  style={[styles.slotLv, { color: RARITY_COLOR[item.rarity] }]}
                >
                  +{item.level}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Item grid cell ────────────────────────────────────────────

function ItemCell({ item, onPress }: { item: GearItem; onPress: () => void }) {
  const color = RARITY_COLOR[item.rarity] ?? C.textMuted;
  return (
    <Pressable style={[styles.cell, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.cellIcon}>{SLOT_ICON[item.slot]}</Text>
      <Text style={[styles.cellRarity, { color }]}>
        {item.rarity.charAt(0).toUpperCase()}
      </Text>
      <Text style={styles.cellLevel}>+{item.level}</Text>
      {item.equippedTo && <View style={styles.equippedDot} />}
    </Pressable>
  );
}

function PetCell({ pet, onPress }: { pet: Pet; onPress: () => void }) {
  const color = RARITY_COLOR[pet.rarity] ?? C.textMuted;
  return (
    <Pressable style={[styles.cell, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.cellIcon}>🐾</Text>
      <Text style={[styles.cellRarity, { color }]}>
        {pet.rarity.charAt(0).toUpperCase()}
      </Text>
      <Text style={styles.cellLevel}>Lv{pet.level}</Text>
      {pet.dungeonSlot !== null && <View style={styles.equippedDot} />}
    </Pressable>
  );
}

// ── Item inspect modal ────────────────────────────────────────

function InspectModal({
  item,
  heroId,
  onEquip,
  onClose,
}: {
  item: GearItem | Pet;
  heroId: string;
  onEquip: () => void;
  onClose: () => void;
}) {
  const isGear = 'slot' in item && item.slot !== 'pet';
  const rColor = RARITY_COLOR[(item as GearItem).rarity] ?? C.textMuted;
  const template = ITEM_TEMPLATES[(item as GearItem).templateId];
  const isEquipped = isGear
    ? (item as GearItem).equippedTo === heroId
    : (item as Pet).dungeonSlot !== null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View
          style={[styles.modalHeader, { borderBottomColor: rColor + '55' }]}
        >
          <Text style={styles.modalIcon}>
            {isGear ? SLOT_ICON[(item as GearItem).slot] : '🐾'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>
              {template?.name ?? (item as Pet).name}
            </Text>
            <Text style={[styles.modalRarity, { color: rColor }]}>
              {RARITY_LABEL[(item as GearItem).rarity]} ·{' '}
              {'slot' in item ? SLOT_LABEL[(item as GearItem).slot] : 'Pet'}
            </Text>
          </View>
          <Text style={styles.modalLevel}>
            +{(item as GearItem).level ?? (item as Pet).level}
          </Text>
        </View>

        {/* Description */}
        {template?.description && (
          <Text style={styles.modalDesc}>{template.description}</Text>
        )}

        {/* Stats */}
        <View style={styles.statsBlock}>
          {(item.stats.atk ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statL}>ATK</Text>
              <Text style={styles.statR}>{Math.round(item.stats.atk)}</Text>
            </View>
          )}
          {(item.stats.def ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statL}>DEF</Text>
              <Text style={styles.statR}>{Math.round(item.stats.def)}</Text>
            </View>
          )}
          {(item.stats.hp ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statL}>HP</Text>
              <Text style={styles.statR}>{Math.round(item.stats.hp)}</Text>
            </View>
          )}
          {(item.stats.crit ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statL}>CRIT</Text>
              <Text style={styles.statR}>{item.stats.crit}%</Text>
            </View>
          )}
          {(item.stats.critDmg ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statL}>CRIT DMG</Text>
              <Text style={styles.statR}>{item.stats.critDmg}%</Text>
            </View>
          )}
          <View style={styles.statRow}>
            <Text style={styles.statL}>CP</Text>
            <Text style={[styles.statR, { color: C.gold }]}>
              {(item as GearItem).cp}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <Pressable
          style={[styles.equipBtn, isEquipped && styles.unequipBtn]}
          onPress={onEquip}
        >
          <Text style={[styles.equipBtnText, isEquipped && { color: C.red }]}>
            {isEquipped ? 'Unequip' : 'Equip to hero'}
          </Text>
        </Pressable>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Tabs ──────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gear', label: 'Gear' },
  { key: 'pets', label: 'Pets' },
  { key: 'mats', label: 'Mats' },
  { key: 'currencies', label: 'Wallet' },
];

// ── Main screen ───────────────────────────────────────────────

export default function InventoryScreen() {
  const { gearState, equip, unequip } = useGear();
  const { currencies } = usePlayer();

  const [heroIndex, setHeroIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [inspecting, setInspecting] = useState<GearItem | Pet | null>(null);
  const heroScrollRef = useRef<ScrollView>(null);

  const hero = HEROES[heroIndex];
  const loadout = gearState.loadouts[hero.id];
  const gearMap = loadout?.gear ?? {};

  // Filter items by tab
  const allItems = gearState.items;
  const allPets = gearState.pets;

  const filteredItems =
    activeTab === 'all' ? allItems : activeTab === 'gear' ? allItems : [];
  const filteredPets =
    activeTab === 'all' || activeTab === 'pets' ? allPets : [];

  function handleSlotPress(slot: GearSlot) {
    const item = gearMap[slot as Exclude<GearSlot, 'pet'>];
    if (item) setInspecting(item);
  }

  function handleEquip() {
    if (!inspecting) return;
    const isGear = 'equippedTo' in inspecting;
    if (isGear) {
      const g = inspecting as GearItem;
      if (g.equippedTo === hero.id) {
        unequip(g.id, hero.id);
      } else {
        equip(g.id, hero.id);
      }
    }
    setInspecting(null);
  }

  function handleHeroScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setHeroIndex(idx);
  }

  return (
    <View style={styles.screen}>
      {/* Currency bar */}
      <CurrencyBar />

      {/* Hero loadout — swipeable */}
      <ScrollView
        ref={heroScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleHeroScroll}
        style={styles.heroScroll}
      >
        {HEROES.map((h, i) => (
          <View key={h.id} style={{ width: SW }}>
            <HeroLoadoutCard
              hero={h}
              loadout={gearState.loadouts[h.id]?.gear ?? {}}
              items={allItems}
              onSlotPress={handleSlotPress}
            />
          </View>
        ))}
      </ScrollView>

      {/* Hero dots */}
      <View style={styles.heroDots}>
        {HEROES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === heroIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === t.key && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grid */}
      {activeTab === 'currencies' ? (
        <ScrollView
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
        >
          {CURRENCY_META.map((m) => (
            <View key={m.key} style={styles.currRow}>
              <Text style={styles.currRowIcon}>{m.icon}</Text>
              <Text style={styles.currRowLabel}>{m.label}</Text>
              <Text style={[styles.currRowVal, { color: m.color }]}>
                {fmt(currencies[m.key])}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : activeTab === 'mats' ? (
        <ScrollView
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
        >
          {[
            {
              label: 'Craft Materials',
              icon: '⚙️',
              val: currencies.craftMats,
              color: C.orange,
            },
            {
              label: 'XP Books',
              icon: '📖',
              val: currencies.xpBooks,
              color: C.blue,
            },
            {
              label: 'Upgrade Scrolls',
              icon: '📋',
              val: currencies.upgradeScrolls,
              color: '#34D399',
            },
            {
              label: '+10% Stone',
              icon: '🔮',
              val: currencies.stone10,
              color: '#C4B5FD',
            },
            {
              label: '+20% Stone',
              icon: '🔮',
              val: currencies.stone20,
              color: '#8B5CF6',
            },
            {
              label: '+30% Stone',
              icon: '🔮',
              val: currencies.stone30,
              color: '#6D28D9',
            },
          ].map((r) => (
            <View key={r.label} style={styles.currRow}>
              <Text style={styles.currRowIcon}>{r.icon}</Text>
              <Text style={styles.currRowLabel}>{r.label}</Text>
              <Text style={[styles.currRowVal, { color: r.color }]}>
                {r.val}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={[
            ...filteredItems.map((i) => ({ type: 'item' as const, data: i })),
            ...filteredPets.map((p) => ({ type: 'pet' as const, data: p })),
          ]}
          keyExtractor={(r) => r.data.id}
          numColumns={4}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySub}>
                Farm zones and dungeons to collect gear
              </Text>
            </View>
          }
          renderItem={({ item: row }) =>
            row.type === 'item' ? (
              <ItemCell
                item={row.data as GearItem}
                onPress={() => setInspecting(row.data as GearItem)}
              />
            ) : (
              <PetCell
                pet={row.data as Pet}
                onPress={() => setInspecting(row.data as Pet)}
              />
            )
          }
        />
      )}

      {/* Inspect modal */}
      {inspecting && (
        <Modal transparent animationType="fade">
          <InspectModal
            item={inspecting}
            heroId={hero.id}
            onEquip={handleEquip}
            onClose={() => setInspecting(null)}
          />
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const CELL_SIZE = (SW - 32 - 12) / 4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 54 },

  currBar: {
    maxHeight: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  currBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    paddingVertical: 8,
  },
  currChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currIcon: { fontSize: 13 },
  currVal: { fontSize: 12, fontWeight: '600' },
  heroScroll: { maxHeight: 280 },
  heroCard: {
    width: SW,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
    gap: 4,
  },
  heroAvatarWrap: { alignItems: 'center', gap: 1 },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroName: { fontSize: 12, fontWeight: '600', color: C.textPrimary },
  heroStars: { fontSize: 9, color: C.gold },
  heroLevel: { fontSize: 10, color: C.textMuted },
  heroInitial: { fontSize: 18, fontWeight: '700' },

  slotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    width: '100%',
  },
  slotsCol: { gap: 6, justifyContent: 'center' },
  heroCentreWrap: { width: 100, alignItems: 'center' },
  heroCentre: {
    width: 90,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  heroCentreText: { fontSize: 38, fontWeight: '700' },
  slotBtn: {
    width: 54,
    height: 54,
    backgroundColor: C.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 1,
  },
  slotEmoji: { fontSize: 20 },
  slotLv: { fontSize: 9, fontWeight: '600' },
  bottomSlotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },

  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive: { backgroundColor: C.textMuted },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
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

  grid: { flex: 1 },
  gridContent: { padding: 8, gap: 4 },

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

  emptyGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyText: { fontSize: 15, color: C.textMuted },
  emptySub: {
    fontSize: 12,
    color: C.textMuted,
    opacity: 0.6,
    textAlign: 'center',
  },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
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
  modalIcon: { fontSize: 32 },
  modalName: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  modalRarity: { fontSize: 12, marginTop: 2 },
  modalLevel: { fontSize: 22, fontWeight: '700', color: C.gold },
  modalDesc: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
  statsBlock: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statL: { fontSize: 13, color: C.textMuted },
  statR: { fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  equipBtn: {
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unequipBtn: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.red,
  },
  equipBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
  closeBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  closeBtnText: { fontSize: 14, color: C.textMuted },
});
