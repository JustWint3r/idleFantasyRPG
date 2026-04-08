// ─────────────────────────────────────────────────────────────
//  CharacterScreen.tsx
//  Layout: currency header → gear slots flanking character
//  portrait → talent tree button → inventory list below
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useGear } from '../context/GearContext';
import {
  RARITY_COLOR,
  RARITY_LABEL,
  SLOT_ICON,
  SLOT_LABEL,
  type GearItem,
  type GearSlot,
} from '../types/gear.types';
import { calcLoadoutCp, calcLoadoutStats } from '../engine/gearEngine';
import { ITEM_TEMPLATES } from '../data/gearTemplates.data';
import TalentScreen from './TalentScreen';

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

// 4 gear slots per column — bottom-left = pet, bottom-right = talent
const LEFT_SLOTS: GearSlot[] = ['weapon', 'armor', 'helmet', 'ring'];
const RIGHT_SLOTS: GearSlot[] = ['accessory', 'boots', 'necklace'];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ── Gear slot button ──────────────────────────────────────────

function GearSlotBtn({
  slot,
  item,
  onPress,
}: {
  slot: GearSlot;
  item?: GearItem;
  onPress: () => void;
}) {
  const borderColor = item ? RARITY_COLOR[item.rarity] : C.border;
  return (
    <Pressable style={[styles.slotBtn, { borderColor }]} onPress={onPress}>
      <Text style={styles.slotIcon}>{SLOT_ICON[slot]}</Text>
      {item ? (
        <Text style={[styles.slotLevel, { color: RARITY_COLOR[item.rarity] }]}>
          +{item.level}
        </Text>
      ) : (
        <Text style={styles.slotEmpty} numberOfLines={1}>
          {SLOT_LABEL[slot]}
        </Text>
      )}
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
  item: GearItem;
  heroId: string;
  onEquip: () => void;
  onClose: () => void;
}) {
  const rColor = RARITY_COLOR[item.rarity];
  const template = ITEM_TEMPLATES[item.templateId];
  const isEquipped = item.equippedTo === heroId;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View
          style={[styles.modalHeader, { borderBottomColor: rColor + '55' }]}
        >
          <Text style={styles.modalIconText}>{SLOT_ICON[item.slot]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalName}>
              {template?.name ?? item.templateId.replace(/_/g, ' ')}
            </Text>
            <Text style={[styles.modalRarity, { color: rColor }]}>
              {RARITY_LABEL[item.rarity]} · {SLOT_LABEL[item.slot]}
            </Text>
          </View>
          <Text style={[styles.modalLevel, { color: C.gold }]}>
            +{item.level}
          </Text>
        </View>

        <View style={styles.statsBlock}>
          {item.stats.atk > 0 && (
            <StatRow label="ATK" value={`${Math.round(item.stats.atk)}`} />
          )}
          {item.stats.def > 0 && (
            <StatRow label="DEF" value={`${Math.round(item.stats.def)}`} />
          )}
          {item.stats.hp > 0 && (
            <StatRow label="HP" value={fmt(item.stats.hp)} />
          )}
          {item.stats.crit > 0 && (
            <StatRow label="CRIT" value={`${item.stats.crit}%`} />
          )}
          {item.stats.critDmg > 0 && (
            <StatRow label="CRIT DMG" value={`${item.stats.critDmg}%`} />
          )}
          <StatRow label="CP" value={String(item.cp)} highlight />
        </View>

        <Pressable
          style={[styles.equipBtn, isEquipped && styles.unequipBtn]}
          onPress={onEquip}
        >
          <Text style={[styles.equipBtnText, isEquipped && { color: C.red }]}>
            {isEquipped ? 'Unequip' : 'Equip'}
          </Text>
        </Pressable>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statL}>{label}</Text>
      <Text style={[styles.statR, highlight && { color: C.gold }]}>
        {value}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function CharacterScreen() {
  const { gearState, equip, unequip } = useGear();
  const [inspecting, setInspecting] = useState<GearItem | null>(null);
  const [showTalent, setShowTalent] = useState(false);

  const loadout = gearState.loadouts[MOCK_HERO_ID];
  const gear = loadout?.gear ?? {};
  const totalCp = calcLoadoutCp(gearState, MOCK_HERO_ID);
  const totalStats = calcLoadoutStats(gearState, MOCK_HERO_ID);

  const inventoryItems = gearState.items.filter((i) => !i.equippedTo);

  function openSlot(slot: GearSlot) {
    const item = gear[slot as keyof typeof gear];
    if (item) {
      const fresh = gearState.items.find((i) => i.id === item.id);
      if (fresh) setInspecting(fresh);
    }
  }

  function handleEquip() {
    if (!inspecting) return;
    if (inspecting.equippedTo === MOCK_HERO_ID) {
      unequip(inspecting.id, MOCK_HERO_ID);
    } else {
      equip(inspecting.id, MOCK_HERO_ID);
    }
    setInspecting(null);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Combat power summary ── */}
        <View style={styles.cpRow}>
          <Text style={styles.cpValue}>{totalCp.toLocaleString()}</Text>
          <Text style={styles.cpLabel}> Combat Power</Text>
        </View>

        {/* ── Character + gear layout ── */}
        <View style={styles.characterPanel}>
          {/* Portrait — natural-flow centre, determines panel height */}
          <View style={styles.centreCol}>
            <View style={styles.characterPortrait}>
              <Image
                source={require('../../assets/aria.png')}
                style={styles.portraitImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.portraitName}>Aria</Text>
            <Text style={styles.portraitLevel}>Lv 42</Text>
          </View>

          {/* Left gear column — absolute layer, never shifts with portrait */}
          <View style={styles.gearColLeft}>
            {LEFT_SLOTS.map((slot) => (
              <GearSlotBtn
                key={slot}
                slot={slot}
                item={gear[slot as keyof typeof gear]}
                onPress={() => openSlot(slot)}
              />
            ))}
            <Pressable style={styles.slotBtn} onPress={() => {}}>
              <Text style={styles.slotIcon}>🐾</Text>
              <Text style={styles.slotEmpty}>Pet</Text>
            </Pressable>
          </View>

          {/* Right gear column — absolute layer, never shifts with portrait */}
          <View style={styles.gearColRight}>
            {RIGHT_SLOTS.map((slot) => (
              <GearSlotBtn
                key={slot}
                slot={slot}
                item={gear[slot as keyof typeof gear]}
                onPress={() => openSlot(slot)}
              />
            ))}
            <Pressable
              style={styles.slotBtn}
              onPress={() => setShowTalent(true)}
            >
              <Text style={styles.slotIcon}>🌟</Text>
              <Text style={styles.slotEmpty}>Talent</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          {totalStats.atk > 0 && (
            <Text style={styles.statChip}>ATK {fmt(totalStats.atk)}</Text>
          )}
          {totalStats.def > 0 && (
            <Text style={styles.statChip}>DEF {fmt(totalStats.def)}</Text>
          )}
          {totalStats.hp > 0 && (
            <Text style={styles.statChip}>HP {fmt(totalStats.hp)}</Text>
          )}
          {totalStats.crit > 0 && (
            <Text style={styles.statChip}>CRIT {totalStats.crit}%</Text>
          )}
          {totalStats.critDmg > 0 && (
            <Text style={styles.statChip}>CDMG {totalStats.critDmg}%</Text>
          )}
        </View>

        {/* ── Inventory ── */}
        <View style={styles.inventoryPanel}>
          <Text style={styles.sectionLabel}>INVENTORY</Text>

          {inventoryItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No items in inventory</Text>
              <Text style={styles.emptySub}>Farm dungeons to collect gear</Text>
            </View>
          ) : (
            inventoryItems.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.inventoryRow,
                  { borderColor: RARITY_COLOR[item.rarity] },
                ]}
                onPress={() => setInspecting(item)}
              >
                <Text style={styles.invIcon}>{SLOT_ICON[item.slot]}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.invName,
                      { color: RARITY_COLOR[item.rarity] },
                    ]}
                  >
                    {ITEM_TEMPLATES[item.templateId]?.name ??
                      item.templateId.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.invMeta}>
                    {RARITY_LABEL[item.rarity]} · Lv {item.level} · CP {item.cp}
                  </Text>
                </View>
                <Text style={styles.invArrow}>›</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Inspect modal */}
      {inspecting && (
        <Modal transparent animationType="fade">
          <InspectModal
            item={inspecting}
            heroId={MOCK_HERO_ID}
            onEquip={handleEquip}
            onClose={() => setInspecting(null)}
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
const PORTRAIT_H = 360;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // CP row
  cpRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cpValue: { fontSize: 26, fontWeight: '700', color: C.gold },
  cpLabel: { fontSize: 13, color: C.textMuted },

  // Character panel
  characterPanel: {
    position: 'relative',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingVertical: 16,
  },

  // Gear columns — absolute layers, completely independent of portrait size
  gearColLeft: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: SLOT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  gearColRight: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: SLOT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  slotBtn: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    backgroundColor: C.surfaceHigh,
    borderRadius: SLOT_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotIcon: { fontSize: 20 },
  slotLevel: { fontSize: 9, fontWeight: '700' },
  slotEmpty: { fontSize: 8, color: C.textMuted, textAlign: 'center' },

  // Centre column
  centreCol: {
    alignItems: 'center',
    gap: 8,
  },
  characterPortrait: {
    width: PORTRAIT_W,
    height: PORTRAIT_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: {
    width: PORTRAIT_W,
    height: PORTRAIT_H,
  },
  portraitName: { fontSize: 12, fontWeight: '600', color: C.textPrimary },
  portraitLevel: { fontSize: 10, color: C.textMuted },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
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

  // Inventory panel
  inventoryPanel: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: { fontSize: 14, color: C.textMuted },
  emptySub: { fontSize: 12, color: C.textMuted, opacity: 0.6 },

  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderLeftWidth: 2,
    gap: 12,
  },
  invIcon: { fontSize: 24 },
  invName: { fontSize: 14, fontWeight: '600' },
  invMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  invArrow: { fontSize: 20, color: C.textMuted },

  // Inspect modal
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
  modalIconText: { fontSize: 32 },
  modalName: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  modalRarity: { fontSize: 12, marginTop: 2 },
  modalLevel: { fontSize: 22, fontWeight: '700' },
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

  // Talent modal
  talentOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
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
