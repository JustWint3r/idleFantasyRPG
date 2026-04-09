// ─────────────────────────────────────────────────────────────
//  FarmScreen.tsx
//  Layout based on design mockup:
//   • Fighting Area (top, FarmScene animated)
//   • Player Stats + Currencies strip
//   • Bottom row: Chat/Loot feed (left) + Zone & Pet buttons (right)
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFarmLoop } from '../hooks/useFarmLoop';
import { FARM_ZONES, getEligibleZones } from '../data/lootTables.data';
import { estimateGoldPerHour } from '../engine/farmEngine';
import type {
  DeployedHero,
  FarmResult,
  FarmZone,
  Item,
  Resources,
} from '../types/farm.types';
import FarmScene from '../components/FarmScene';
import { useGear } from '../context/GearContext';
import { farmItemsToGearItems } from '../engine/farmConverter';
import { usePlayer } from '../context/PlayerContext';

const { height: SH } = Dimensions.get('window');

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

// ── Mock heroes available to deploy ──────────────────────────

const MOCK_HEROES: DeployedHero[] = [
  { id: 'hero_001', name: 'Aria the Swift',   level: 42, stars: 3, combatPower: 3800, zoneId: '', deployedAt: 0 },
  { id: 'hero_002', name: 'Kael the Dark',    level: 38, stars: 2, combatPower: 2800, zoneId: '', deployedAt: 0 },
  { id: 'hero_003', name: 'Selene the Sage',  level: 55, stars: 4, combatPower: 6200, zoneId: '', deployedAt: 0 },
];

const HERO_IMAGES: Record<string, ReturnType<typeof require>> = {
  hero_001: require('../../assets/aria.png'),
};

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}

function starsLabel(n: number) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 6 - n));
}

const DROP_COLORS: Record<string, string> = {
  common: C.textMuted, rare: C.blue, epic: C.purple, legendary: C.orange,
};

const ZONE_ICONS: Record<string, string> = {
  zone_meadow: '🌿',
  zone_darkwood: '🌲',
  zone_dragon_peaks: '🐉',
};

// ── Offline claim banner ──────────────────────────────────────

function OfflineBanner({
  heroName, zoneName, durationSeconds, wasCapped, resources, items, onClaim,
}: {
  heroName: string; zoneName: string; durationSeconds: number; wasCapped: boolean;
  resources: Resources; items: Item[]; onClaim: () => void;
}) {
  const h = Math.floor(durationSeconds / 3600);
  const m = Math.floor((durationSeconds % 3600) / 60);
  const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <View style={styles.offlineBanner}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.offlineTitle}>Welcome back!</Text>
        {wasCapped && <Text style={{ fontSize: 11, color: C.orange }}>⚠ Cap reached</Text>}
      </View>
      <Text style={styles.offlineSub}>{heroName} farmed <Text style={{ color: C.textPrimary }}>{zoneName}</Text> for <Text style={{ color: C.textPrimary }}>{dur}</Text></Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {resources.gold > 0 && <Text style={styles.offlineChip}>🪙 {fmt(resources.gold)}</Text>}
        {resources.xpBooks > 0 && <Text style={styles.offlineChip}>📖 {resources.xpBooks}</Text>}
        {resources.craftMats > 0 && <Text style={styles.offlineChip}>⚙️ {resources.craftMats}</Text>}
        {resources.summonScrolls > 0 && <Text style={styles.offlineChip}>✦ {resources.summonScrolls}</Text>}
        {items.length > 0 && <Text style={styles.offlineChip}>⚔️ {items.length} items</Text>}
      </View>
      <Pressable style={styles.claimBtn} onPress={onClaim}>
        <Text style={styles.claimBtnText}>Collect Loot</Text>
      </Pressable>
    </View>
  );
}

// ── Zone picker modal ─────────────────────────────────────────

function ZonePickerModal({
  visible, eligibleZones, currentZoneId, onSelect, onClose,
}: {
  visible: boolean; eligibleZones: FarmZone[]; currentZoneId?: string;
  onSelect: (z: FarmZone) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>Select Zone</Text>
          {FARM_ZONES.map((zone) => {
            const eligible = eligibleZones.some((z) => z.id === zone.id);
            const active = zone.id === currentZoneId;
            return (
              <Pressable
                key={zone.id}
                style={[styles.zoneRow, active && styles.zoneRowActive, !eligible && styles.zoneRowLocked]}
                onPress={() => { if (eligible) { onSelect(zone); onClose(); } }}
                disabled={!eligible}
              >
                <Text style={styles.zoneRowIcon}>{ZONE_ICONS[zone.id] ?? '🗺️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneRowName, !eligible && { color: C.textMuted }]}>
                    {zone.name}{active ? '  ✦' : ''}
                  </Text>
                  <Text style={styles.zoneRowDesc}>{zone.description}</Text>
                  <Text style={styles.zoneRowStats}>
                    Min CP {zone.minCombatPower.toLocaleString()} · ~{fmt(estimateGoldPerHour(zone))}/hr · Cap {zone.offlineCapHours}h
                  </Text>
                </View>
                {!eligible && <Text>🔒</Text>}
              </Pressable>
            );
          })}
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Hero picker modal ─────────────────────────────────────────

function HeroPickerModal({
  visible, currentHeroId, onSelect, onClose,
}: {
  visible: boolean; currentHeroId?: string; onSelect: (h: DeployedHero) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>Select Hero</Text>
          {MOCK_HEROES.map((hero) => {
            const active = hero.id === currentHeroId;
            return (
              <Pressable
                key={hero.id}
                style={[styles.heroPickRow, active && styles.zoneRowActive]}
                onPress={() => { onSelect(hero); onClose(); }}
              >
                <View style={styles.heroPickAvatar}>
                  {HERO_IMAGES[hero.id]
                    ? <Image source={HERO_IMAGES[hero.id]} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    : <Text style={{ fontSize: 18, color: C.purple }}>{hero.name.charAt(0)}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroPickName}>{hero.name}{active ? '  ✦' : ''}</Text>
                  <Text style={styles.heroPickSub}>Lv {hero.level} · {starsLabel(hero.stars)} · CP {hero.combatPower.toLocaleString()}</Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Coming Soon modal (Events / Dungeons) ────────────────────

function ComingSoonModal({
  visible, title, onClose,
}: {
  visible: boolean; title: string; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
            <Text style={{ fontSize: 48 }}>{title === 'Events' ? '🎉' : '⚔️'}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.textPrimary }}>Coming Soon</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>
              {title === 'Events'
                ? 'Limited-time events with exclusive rewards are on the way!'
                : 'Challenging dungeons with powerful bosses are being crafted!'}
            </Text>
          </View>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function FarmScreen() {
  const {
    farmState, offlineSummary, isLoaded,
    sessionResources, sessionItems,
    deployHero, undeployHero, claimOfflineLoot,
  } = useFarmLoop();

  const { getHeroCp, addItems } = useGear();
  const { addCurrencies } = usePlayer();

  const [lastResult, setLastResult] = useState<FarmResult | null>(null);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showDungeons, setShowDungeons] = useState(false);
  const [selectedHero, setSelectedHero] = useState<DeployedHero>(MOCK_HEROES[0]);

  const prevItemCount = useRef(sessionItems.length);
  const prevSyncedResources = useRef({ gold: 0, craftMats: 0, summonScrolls: 0, xpBooks: 0 });

  // Live currency sync
  React.useEffect(() => {
    const delta = {
      gold: sessionResources.gold - prevSyncedResources.current.gold,
      craftMats: sessionResources.craftMats - prevSyncedResources.current.craftMats,
      summonScrolls: sessionResources.summonScrolls - prevSyncedResources.current.summonScrolls,
      xpBooks: sessionResources.xpBooks - prevSyncedResources.current.xpBooks,
    };
    if (delta.gold > 0 || delta.craftMats > 0 || delta.summonScrolls > 0 || delta.xpBooks > 0) {
      addCurrencies(delta);
    }
    prevSyncedResources.current = { ...sessionResources };
  }, [sessionResources.gold, sessionResources.craftMats, sessionResources.summonScrolls, sessionResources.xpBooks]);

  // Item drops
  React.useEffect(() => {
    if (sessionItems.length > prevItemCount.current) {
      const newItems = sessionItems.slice(prevItemCount.current);
      setLastResult({ durationSeconds: 60, resources: sessionResources, items: newItems, rollCount: 1 });
      addItems(farmItemsToGearItems(newItems));
    }
    prevItemCount.current = sessionItems.length;
  }, [sessionItems.length]);

  const hero = farmState.deployedHero;
  const totalHeroCp = getHeroCp(selectedHero.id, selectedHero.combatPower);
  const eligibleZones = getEligibleZones(totalHeroCp);
  const currentZone = hero ? (FARM_ZONES.find((z) => z.id === hero.zoneId) ?? null) : null;

  const handleDeploy = useCallback((zone: FarmZone) => {
    try {
      deployHero({ ...selectedHero, zoneId: zone.id, deployedAt: Date.now() }, zone);
    } catch (e: any) {
      console.warn('Deploy failed:', e.message);
    }
  }, [deployHero, selectedHero]);

  const handleHeroSelect = useCallback((h: DeployedHero) => {
    setSelectedHero(h);
    // If currently farming, redeploy with new hero in same zone
    if (hero && currentZone) {
      undeployHero();
      setTimeout(() => {
        deployHero({ ...h, zoneId: currentZone.id, deployedAt: Date.now() }, currentZone);
      }, 100);
    }
  }, [hero, currentZone, deployHero, undeployHero]);

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  const recentDrops = [...sessionItems].reverse().slice(0, 8);

  return (
    <View style={styles.screen}>

      {/* ── 1. Fighting Area ── */}
      <View style={styles.fightingArea}>
        <FarmScene hero={hero} zone={currentZone} lastResult={lastResult} />
        {offlineSummary && (
          <View style={styles.offlineOverlay}>
            <OfflineBanner
              heroName={offlineSummary.heroName}
              zoneName={offlineSummary.zoneName}
              durationSeconds={offlineSummary.durationSeconds}
              wasCapped={offlineSummary.wasCapped}
              resources={offlineSummary.result.resources}
              items={offlineSummary.result.items}
              onClaim={() => {
                const claimed = claimOfflineLoot();
                if (claimed?.items?.length) addItems(farmItemsToGearItems(claimed.items));
                addCurrencies({
                  gold: claimed?.gold ?? 0,
                  craftMats: claimed?.craftMats ?? 0,
                  summonScrolls: claimed?.summonScrolls ?? 0,
                  xpBooks: claimed?.xpBooks ?? 0,
                });
              }}
            />
          </View>
        )}
      </View>

      {/* ── 2. Player Stats + Currencies strip ── */}
      <View style={styles.statsStrip}>
        <Pressable style={styles.heroStripBtn} onPress={() => setShowHeroPicker(true)}>
          <View style={styles.heroStripAvatar}>
            {HERO_IMAGES[selectedHero.id]
              ? <Image source={HERO_IMAGES[selectedHero.id]} style={{ width: 36, height: 36, borderRadius: 18 }} />
              : <Text style={{ fontSize: 16, color: C.purple }}>{selectedHero.name.charAt(0)}</Text>}
          </View>
          <View>
            <Text style={styles.heroStripName}>{selectedHero.name}</Text>
            <Text style={styles.heroStripSub}>Lv {selectedHero.level} · CP {totalHeroCp.toLocaleString()}</Text>
          </View>
        </Pressable>

        <View style={styles.statsStripRight}>
          {hero && currentZone ? (
            <>
              <Text style={styles.statChip}>🪙 {fmt(sessionResources.gold)}</Text>
              <Text style={styles.statChip}>~{fmt(estimateGoldPerHour(currentZone))}/hr</Text>
              <Pressable style={styles.recallBtn} onPress={undeployHero}>
                <Text style={styles.recallBtnText}>Recall</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.idleLabel}>Idle</Text>
          )}
        </View>
      </View>

      {/* ── 3. Bottom row ── */}
      <View style={styles.bottomRow}>

        {/* Left: Chat / Loot Feed */}
        <View style={styles.feedPanel}>
          <Text style={styles.feedTitle}>Recent Drops</Text>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {recentDrops.length === 0 ? (
              <Text style={styles.feedEmpty}>No drops yet{'\n'}Deploy a hero to start!</Text>
            ) : (
              recentDrops.map((item, i) => (
                <View key={item.id + i} style={styles.feedRow}>
                  <Text style={[styles.feedDot, { color: DROP_COLORS[item.rarity] ?? C.textMuted }]}>◆</Text>
                  <Text style={styles.feedName} numberOfLines={1}>{item.templateId.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.feedRarity, { color: DROP_COLORS[item.rarity] ?? C.textMuted }]}>
                    {item.rarity.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Right: Zone / Events / Dungeons buttons */}
        <View style={styles.actionCol}>

          {/* Zone button */}
          <Pressable
            style={[styles.circleBtn, hero && styles.circleBtnActive]}
            onPress={() => setShowZonePicker(true)}
          >
            <Text style={styles.circleBtnIcon}>🗺️</Text>
            {hero && <View style={styles.circleActiveDot} />}
          </Pressable>

          {/* Events button */}
          <Pressable style={styles.circleBtn} onPress={() => setShowEvents(true)}>
            <Text style={styles.circleBtnIcon}>🎉</Text>
          </Pressable>

          {/* Dungeons button */}
          <Pressable style={styles.circleBtn} onPress={() => setShowDungeons(true)}>
            <Text style={styles.circleBtnIcon}>⚔️</Text>
          </Pressable>

        </View>
      </View>

      {/* Zone info tooltip when farming */}
      {hero && currentZone && (
        <View style={styles.zoneInfoBar}>
          <Text style={styles.zoneInfoText}>
            {ZONE_ICONS[currentZone.id]} {currentZone.name} · Cap {currentZone.offlineCapHours}h
          </Text>
        </View>
      )}

      {/* ── Modals ── */}
      <ZonePickerModal
        visible={showZonePicker}
        eligibleZones={eligibleZones}
        currentZoneId={hero?.zoneId}
        onSelect={handleDeploy}
        onClose={() => setShowZonePicker(false)}
      />
      <HeroPickerModal
        visible={showHeroPicker}
        currentHeroId={selectedHero.id}
        onSelect={handleHeroSelect}
        onClose={() => setShowHeroPicker(false)}
      />
      <ComingSoonModal
        visible={showEvents}
        title="Events"
        onClose={() => setShowEvents(false)}
      />
      <ComingSoonModal
        visible={showDungeons}
        title="Dungeons"
        onClose={() => setShowDungeons(false)}
      />

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const SCENE_H = SH * 0.38;
const STATS_H = 56;


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  // ── Fighting area
  fightingArea: { height: SCENE_H, overflow: 'hidden' },
  offlineOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000088', justifyContent: 'center', padding: 16,
  },

  // ── Stats strip
  statsStrip: {
    height: STATS_H,
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  heroStripBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  heroStripAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.purple + '33',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.purple + '66',
  },
  heroStripName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  heroStripSub: { fontSize: 11, color: C.textMuted },
  statsStripRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statChip: {
    backgroundColor: C.surfaceHigh, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    fontSize: 11, color: C.gold,
    borderWidth: 0.5, borderColor: C.border,
  },
  recallBtn: {
    backgroundColor: C.surfaceHigh, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  recallBtnText: { fontSize: 12, color: C.red },
  idleLabel: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  // ── Bottom row
  bottomRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },

  // Feed panel (left)
  feedPanel: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 10,
    overflow: 'hidden',
  },
  feedTitle: { fontSize: 10, color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  feedEmpty: { fontSize: 12, color: C.textMuted, opacity: 0.6, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  feedDot: { fontSize: 9 },
  feedName: { flex: 1, fontSize: 11, color: C.textPrimary, textTransform: 'capitalize' },
  feedRarity: { fontSize: 10, fontWeight: '700' },

  // Action column (right)
  actionCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  circleBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnActive: { borderColor: C.green, backgroundColor: C.green + '22' },
  circleBtnLocked: { opacity: 0.45 },
  circleBtnIcon: { fontSize: 22 },
  circleLock: { position: 'absolute', bottom: 2, right: 2 },
  circleActiveDot: {
    position: 'absolute', top: 3, right: 3,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.green,
  },

  // Zone info bar
  zoneInfoBar: {
    position: 'absolute',
    top: SCENE_H - 28,
    right: 12,
    backgroundColor: '#00000066',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  zoneInfoText: { fontSize: 10, color: '#FFFFFFAA' },

  // ── Offline banner
  offlineBanner: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.gold + '44', gap: 8,
  },
  offlineTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  offlineSub: { fontSize: 12, color: C.textMuted },
  offlineChip: {
    backgroundColor: C.surfaceHigh, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    fontSize: 12, color: C.textMuted,
    borderWidth: 0.5, borderColor: C.border,
  },
  claimBtn: { backgroundColor: C.gold, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  claimBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },

  // ── Modals
  modalBackdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 10,
    borderTopWidth: 1, borderColor: C.border,
    maxHeight: SH * 0.7,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 4 },
  modalClose: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 4 },

  zoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceHigh, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  zoneRowActive: { borderColor: C.green + '88', backgroundColor: C.green + '11' },
  zoneRowLocked: { opacity: 0.5 },
  zoneRowIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  zoneRowName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  zoneRowDesc: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  zoneRowStats: { fontSize: 10, color: C.textMuted, marginTop: 2 },

  heroPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceHigh, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  heroPickAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.purple + '33', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.purple + '66',
  },
  heroPickName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  heroPickSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
});
