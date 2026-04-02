// ─────────────────────────────────────────────────────────────
//  GearScreen.tsx
//  Shows hero gear loadout, inventory, and upgrade interface.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  GEAR_SLOTS,
  RARITY_COLOR,
  RARITY_LABEL,
  SLOT_ICON,
  SLOT_LABEL,
  SUPPORT_STONES,
  type GearItem,
  type GearSlot,
  type GearState,
  type Pet,
  type UpgradeResult,
} from '../types/gear.types';

import {
  attemptUpgrade,
  applyUpgradeResult,
  calcLoadoutCp,
  calcLoadoutStats,
  createItem,
  createPet,
  equipItem,
  initialGearState,
  previewSuccessChance,
  previewUpgradeCost,
  unequipItem,
} from '../engine/gearEngine';

import { useGear } from '../context/GearContext';

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
  red: '#F87171',
  purple: '#A78BFA',
  blue: '#60A5FA',
} as const;

const MOCK_HERO_ID = 'hero_001';

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

function rarityBorder(rarity: string): object {
  if (rarity === 'mythical') {
    // Animated RGB would be here — static gold for now
    return { borderColor: '#F5C842', borderWidth: 2 };
  }
  return {
    borderColor: RARITY_COLOR[rarity as keyof typeof RARITY_COLOR] ?? C.border,
    borderWidth: 1.5,
  };
}

// ── Gear slot card ────────────────────────────────────────────

function SlotCard({
  slot,
  item,
  onPress,
}: {
  slot: GearSlot;
  item?: GearItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.slotCard,
        item
          ? rarityBorder(item.rarity)
          : { borderColor: C.border, borderWidth: 1 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.slotIcon}>{SLOT_ICON[slot]}</Text>
      {item ? (
        <>
          <Text
            style={[styles.slotItemName, { color: RARITY_COLOR[item.rarity] }]}
            numberOfLines={1}
          >
            {item.templateId.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.slotItemLevel}>+{item.level}</Text>
        </>
      ) : (
        <Text style={styles.slotEmpty}>{SLOT_LABEL[slot]}</Text>
      )}
    </Pressable>
  );
}

// ── Pet slot card ─────────────────────────────────────────────

function PetSlotCard({
  index,
  pet,
  onPress,
}: {
  index: number;
  pet?: Pet;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.petCard,
        pet
          ? rarityBorder(pet.rarity)
          : { borderColor: C.border, borderWidth: 1 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.petIcon}>🐾</Text>
      {pet ? (
        <>
          <Text
            style={[styles.petName, { color: RARITY_COLOR[pet.rarity] }]}
            numberOfLines={1}
          >
            {pet.name}
          </Text>
          <Text style={styles.petLevel}>Lv {pet.level}</Text>
        </>
      ) : (
        <Text style={styles.slotEmpty}>Pet {index + 1}</Text>
      )}
    </Pressable>
  );
}

// ── Stat row ──────────────────────────────────────────────────

function StatRow({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  if (value === 0) return null;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {fmt(value)}
        {suffix}
      </Text>
    </View>
  );
}

// ── Upgrade modal ─────────────────────────────────────────────

function UpgradeModal({
  item,
  state,
  onClose,
  onUpgrade,
}: {
  item: GearItem;
  state: GearState;
  onClose: () => void;
  onUpgrade: (result: UpgradeResult, stoneId?: string) => void;
}) {
  const [selectedStoneId, setSelectedStoneId] = useState<string | undefined>();

  const stoneBonus = selectedStoneId
    ? (SUPPORT_STONES.find((s) => s.id === selectedStoneId)?.bonusPercent ?? 0)
    : 0;

  const cost = previewUpgradeCost(item);
  const chance = previewSuccessChance(item, stoneBonus);
  const isMaxLevel = item.level >= 25;
  const template = require('../data/gearTemplates.data').getTemplate(
    item.templateId,
  );

  function handleUpgrade() {
    const result = attemptUpgrade(item, { supportStoneBonus: stoneBonus });
    onUpgrade(result, selectedStoneId);
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{template.name}</Text>
          <Text
            style={[styles.rarityBadge, { color: RARITY_COLOR[item.rarity] }]}
          >
            {RARITY_LABEL[item.rarity]}
          </Text>
        </View>

        <View style={styles.modalLevelRow}>
          <Text style={styles.modalLevel}>Level {item.level}</Text>
          {!isMaxLevel && (
            <Text style={styles.modalLevelNext}>→ {item.level + 1}</Text>
          )}
          {isMaxLevel && (
            <Text style={[styles.modalLevel, { color: C.gold }]}>MAX</Text>
          )}
        </View>

        {/* Current stats */}
        <View style={styles.statsBlock}>
          <StatRow label="ATK" value={item.stats.atk} />
          <StatRow label="DEF" value={item.stats.def} />
          <StatRow label="HP" value={item.stats.hp} />
          <StatRow label="CRIT" value={item.stats.crit} suffix="%" />
          <StatRow label="CRIT DMG" value={item.stats.critDmg} suffix="%" />
        </View>

        {!isMaxLevel && (
          <>
            {/* Success chance */}
            <View style={styles.chanceRow}>
              <Text style={styles.chanceLabel}>Success rate</Text>
              <Text
                style={[
                  styles.chanceValue,
                  {
                    color:
                      chance >= 80 ? C.green : chance >= 40 ? C.gold : C.red,
                  },
                ]}
              >
                {chance}%
              </Text>
            </View>

            {/* Support stones */}
            {template.upgradeType === 'probability' && item.level >= 5 && (
              <View style={styles.stonesRow}>
                <Text style={styles.stonesLabel}>Support stone</Text>
                <View style={styles.stonesOptions}>
                  <Pressable
                    style={[
                      styles.stoneBtn,
                      !selectedStoneId && styles.stoneBtnActive,
                    ]}
                    onPress={() => setSelectedStoneId(undefined)}
                  >
                    <Text style={styles.stoneBtnText}>None</Text>
                  </Pressable>
                  {SUPPORT_STONES.map((s) => {
                    const count = state.supportStones[s.id] ?? 0;
                    return (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.stoneBtn,
                          selectedStoneId === s.id && styles.stoneBtnActive,
                          count === 0 && { opacity: 0.35 },
                        ]}
                        onPress={() => count > 0 && setSelectedStoneId(s.id)}
                        disabled={count === 0}
                      >
                        <Text style={styles.stoneBtnText}>{s.label}</Text>
                        <Text style={styles.stoneBtnCount}>×{count}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Cost */}
            <View style={styles.costRow}>
              <Text style={styles.costItem}>🪙 {fmt(cost.gold)} gold</Text>
              <Text style={styles.costItem}>⚙ {cost.mats} mats</Text>
              {cost.scrolls > 0 && (
                <Text style={styles.costItem}>📜 {cost.scrolls} scroll</Text>
              )}
            </View>

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

// ── Upgrade result toast ──────────────────────────────────────

function ResultToast({
  result,
  onDismiss,
}: {
  result: UpgradeResult;
  onDismiss: () => void;
}) {
  const success = result.outcome !== 'fail';
  return (
    <Pressable
      style={[styles.toast, { borderColor: success ? C.green : C.red }]}
      onPress={onDismiss}
    >
      <Text style={[styles.toastTitle, { color: success ? C.green : C.red }]}>
        {result.outcome === 'guaranteed'
          ? '✓ Upgraded!'
          : result.outcome === 'success'
            ? `✓ Success! (rolled ${result.chanceRolled}%)`
            : `✗ Failed (needed ≤${result.chanceFinal}%, rolled ${result.chanceRolled}%)`}
      </Text>
      {!success && (
        <Text style={styles.toastSub}>
          Item dropped to level {result.item.level}. Try again.
        </Text>
      )}
      <Text style={styles.toastDismiss}>Tap to dismiss</Text>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function GearScreen() {
  const {
    gearState,
    isLoaded,
    equip,
    unequip,
    upgrade,
    applyUpgrade,
    assignPet,
    getHeroCp,
  } = useGear();

  const [selectedItem, setSelectedItem] = useState<GearItem | null>(null);
  const [lastResult, setLastResult] = useState<UpgradeResult | null>(null);

  const loadout = gearState.loadouts[MOCK_HERO_ID];
  const totalStats = calcLoadoutStats(gearState, MOCK_HERO_ID);
  const totalCp = calcLoadoutCp(gearState, MOCK_HERO_ID);

  function handleUpgrade(result: UpgradeResult, stoneId?: string) {
    applyUpgrade(result, stoneId);
    setSelectedItem(result.item); // keep modal open with updated item
    setLastResult(result);
  }

  const gearSlots = GEAR_SLOTS.filter((s) => s !== 'pet') as Exclude<
    GearSlot,
    'pet'
  >[];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Hero CP summary */}
      <View style={styles.cpCard}>
        <Text style={styles.cpLabel}>Gear combat power</Text>
        <Text style={styles.cpValue}>{totalCp.toLocaleString()}</Text>
        <View style={styles.totalStats}>
          {totalStats.atk > 0 && (
            <Text style={styles.totalStat}>ATK {fmt(totalStats.atk)}</Text>
          )}
          {totalStats.def > 0 && (
            <Text style={styles.totalStat}>DEF {fmt(totalStats.def)}</Text>
          )}
          {totalStats.hp > 0 && (
            <Text style={styles.totalStat}>HP {fmt(totalStats.hp)}</Text>
          )}
          {totalStats.crit > 0 && (
            <Text style={styles.totalStat}>CRIT {totalStats.crit}%</Text>
          )}
          {totalStats.critDmg > 0 && (
            <Text style={styles.totalStat}>CDMG {totalStats.critDmg}%</Text>
          )}
        </View>
      </View>

      {/* Gear slots grid */}
      <Text style={styles.sectionLabel}>Equipment</Text>
      <View style={styles.slotsGrid}>
        {gearSlots.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            item={loadout?.gear[slot]}
            onPress={() => {
              const item = loadout?.gear[slot];
              if (item) {
                // Always read fresh from state, not stale loadout reference
                const fresh = gearState.items.find((i) => i.id === item.id);
                if (fresh) setSelectedItem(fresh);
              }
            }}
          />
        ))}
      </View>

      {/* Pet slots */}
      <Text style={styles.sectionLabel}>Pets (dungeon · max 3)</Text>
      <View style={styles.petsRow}>
        {[0, 1, 2].map((i) => (
          <PetSlotCard
            key={i}
            index={i}
            pet={gearState.pets.find((p) => p.dungeonSlot === i)}
            onPress={() => {}}
          />
        ))}
      </View>

      {/* Inventory */}
      <Text style={styles.sectionLabel}>Inventory</Text>
      {gearState.items.filter((i) => !i.equippedTo).length === 0 ? (
        <View style={styles.emptyInventory}>
          <Text style={styles.emptyText}>No items in inventory</Text>
          <Text style={styles.emptySubText}>Farm dungeons to collect gear</Text>
        </View>
      ) : (
        gearState.items
          .filter((i) => !i.equippedTo)
          .map((item) => (
            <Pressable
              key={item.id}
              style={[styles.inventoryRow, rarityBorder(item.rarity)]}
              onPress={() => setSelectedItem(item)}
            >
              <Text style={styles.inventoryIcon}>{SLOT_ICON[item.slot]}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.inventoryName,
                    { color: RARITY_COLOR[item.rarity] },
                  ]}
                >
                  {item.templateId.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.inventoryMeta}>
                  {RARITY_LABEL[item.rarity]} · Lv {item.level} · CP {item.cp}
                </Text>
              </View>
              <Text style={styles.inventoryArrow}>›</Text>
            </Pressable>
          ))
      )}

      {/* Upgrade toast */}
      {lastResult && (
        <ResultToast
          result={lastResult}
          onDismiss={() => setLastResult(null)}
        />
      )}

      {/* Upgrade modal */}
      {selectedItem && (
        <Modal transparent animationType="fade">
          <UpgradeModal
            item={selectedItem}
            state={gearState}
            onClose={() => setSelectedItem(null)}
            onUpgrade={handleUpgrade}
          />
        </Modal>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  cpCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 6,
  },
  cpLabel: { fontSize: 12, color: C.textMuted },
  cpValue: { fontSize: 28, fontWeight: '700', color: C.gold },
  totalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  totalStat: {
    fontSize: 12,
    color: C.textMuted,
    backgroundColor: C.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotCard: {
    width: '22%',
    aspectRatio: 0.85,
    backgroundColor: C.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 3,
  },
  slotIcon: { fontSize: 22 },
  slotItemName: { fontSize: 9, textAlign: 'center' },
  slotItemLevel: { fontSize: 10, color: C.gold, fontWeight: '600' },
  slotEmpty: { fontSize: 9, color: C.textMuted, textAlign: 'center' },

  petsRow: { flexDirection: 'row', gap: 8 },
  petCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  petIcon: { fontSize: 24 },
  petName: { fontSize: 10, textAlign: 'center' },
  petLevel: { fontSize: 10, color: C.textMuted },

  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  inventoryIcon: { fontSize: 22 },
  inventoryName: { fontSize: 13, fontWeight: '600' },
  inventoryMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  inventoryArrow: { fontSize: 20, color: C.textMuted },
  emptyInventory: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: C.textMuted },
  emptySubText: { fontSize: 12, color: C.textMuted, opacity: 0.6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  rarityBadge: { fontSize: 12, fontWeight: '500' },
  modalLevelRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modalLevel: { fontSize: 14, color: C.textMuted },
  modalLevelNext: { fontSize: 14, color: C.green },

  statsBlock: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: C.textMuted },
  statValue: { fontSize: 13, color: C.textPrimary, fontWeight: '500' },

  chanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chanceLabel: { fontSize: 13, color: C.textMuted },
  chanceValue: { fontSize: 18, fontWeight: '700' },

  stonesRow: { gap: 8 },
  stonesLabel: { fontSize: 12, color: C.textMuted },
  stonesOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  stoneBtnActive: { borderColor: C.gold, backgroundColor: C.gold + '22' },
  stoneBtnText: { fontSize: 11, color: C.textPrimary },
  stoneBtnCount: { fontSize: 10, color: C.textMuted },

  costRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  costItem: { fontSize: 12, color: C.textMuted },

  upgradeBtn: {
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
  closeBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  closeBtnText: { fontSize: 14, color: C.textMuted },

  toast: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1.5,
    marginTop: 8,
  },
  toastTitle: { fontSize: 14, fontWeight: '600' },
  toastSub: { fontSize: 12, color: C.textMuted },
  toastDismiss: { fontSize: 11, color: C.textMuted, marginTop: 4 },
});
