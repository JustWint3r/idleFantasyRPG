// ─────────────────────────────────────────────────────────────
//  FarmScreen.tsx  (updated — includes FarmScene)
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
} as const;

const MOCK_HERO: DeployedHero = {
  id: 'hero_001',
  name: 'Aria the Swift',
  level: 42,
  stars: 3,
  combatPower: 3800,
  zoneId: 'zone_darkwood',
  deployedAt: Date.now(),
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatGold(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n));
}

function starsLabel(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 6 - count));
}

function OfflineBanner({
  heroName,
  zoneName,
  durationSeconds,
  wasCapped,
  resources,
  items,
  onClaim,
}: {
  heroName: string;
  zoneName: string;
  durationSeconds: number;
  wasCapped: boolean;
  resources: Resources;
  items: Item[];
  onClaim: () => void;
}) {
  return (
    <View style={styles.offlineBanner}>
      <View style={styles.offlineHeader}>
        <Text style={styles.offlineTitle}>Welcome back!</Text>
        {wasCapped && <Text style={styles.offlineCap}>⚠ Loot cap reached</Text>}
      </View>
      <Text style={styles.offlineSub}>
        {heroName} farmed{' '}
        <Text style={{ color: C.textPrimary }}>{zoneName}</Text> for{' '}
        <Text style={{ color: C.textPrimary }}>
          {formatDuration(durationSeconds)}
        </Text>
      </Text>
      <View style={styles.offlineLoot}>
        {resources.gold > 0 && (
          <Text style={styles.offlineLootItem}>
            <Text style={{ color: C.gold }}>⬡ </Text>
            {formatGold(resources.gold)} gold
          </Text>
        )}
        {resources.xpBooks > 0 && (
          <Text style={styles.offlineLootItem}>
            <Text style={{ color: C.blue }}>📖 </Text>
            {resources.xpBooks} XP books
          </Text>
        )}
        {resources.craftMats > 0 && (
          <Text style={styles.offlineLootItem}>
            <Text style={{ color: C.green }}>⚙ </Text>
            {resources.craftMats} craft mats
          </Text>
        )}
        {resources.summonScrolls > 0 && (
          <Text style={styles.offlineLootItem}>
            <Text style={{ color: C.purple }}>✦ </Text>
            {resources.summonScrolls} scrolls
          </Text>
        )}
        {items.length > 0 && (
          <Text style={styles.offlineLootItem}>
            <Text style={{ color: C.orange }}>⚔ </Text>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.claimBtn, pressed && { opacity: 0.75 }]}
        onPress={onClaim}
      >
        <Text style={styles.claimBtnText}>Collect loot</Text>
      </Pressable>
    </View>
  );
}

function HeroCard({
  hero,
  zone,
  sessionGold,
  onUndeploy,
}: {
  hero: DeployedHero;
  zone: FarmZone;
  sessionGold: number;
  onUndeploy: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroRow}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{hero.name.charAt(0)}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{hero.name}</Text>
          <Text style={styles.heroStars}>{starsLabel(hero.stars)}</Text>
          <Text style={styles.heroLevel}>
            Lv {hero.level} · CP {hero.combatPower.toLocaleString()}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.recallBtn,
            pressed && { opacity: 0.6 },
          ]}
          onPress={onUndeploy}
        >
          <Text style={styles.recallBtnText}>Recall</Text>
        </Pressable>
      </View>
      <View style={styles.zonePill}>
        <Text style={styles.zonePillText}>📍 {zone.name}</Text>
        <Text style={styles.zonePillGph}>
          ~{formatGold(estimateGoldPerHour(zone))}/hr
        </Text>
      </View>
      <View style={styles.sessionRow}>
        <Text style={styles.sessionLabel}>This session</Text>
        <Text style={styles.sessionGold}>+{formatGold(sessionGold)} gold</Text>
      </View>
    </View>
  );
}

function ZoneSelector({
  eligibleZones,
  currentZoneId,
  onSelect,
}: {
  eligibleZones: FarmZone[];
  currentZoneId: string | undefined;
  onSelect: (z: FarmZone) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>Farm zones</Text>
      {FARM_ZONES.map((zone) => {
        const eligible = eligibleZones.some((z) => z.id === zone.id);
        const active = zone.id === currentZoneId;
        return (
          <Pressable
            key={zone.id}
            style={[
              styles.zoneCard,
              active && styles.zoneCardActive,
              !eligible && styles.zoneCardLocked,
            ]}
            onPress={() => eligible && onSelect(zone)}
            disabled={!eligible}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.zoneName, !eligible && { color: C.textMuted }]}
              >
                {zone.name}
                {active ? '  ✦ active' : ''}
              </Text>
              <Text style={styles.zoneDesc}>{zone.description}</Text>
              <Text style={styles.zoneStats}>
                Min CP {zone.minCombatPower.toLocaleString()}
                {'  ·  '}~{formatGold(estimateGoldPerHour(zone))}/hr
                {'  ·  '}Cap {zone.offlineCapHours}h
              </Text>
            </View>
            {!eligible && <Text style={styles.lockIcon}>🔒</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function LootFeed({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const recent = [...items].reverse().slice(0, 10);
  const RARITY_COLOR: Record<string, string> = {
    common: C.textMuted,
    rare: C.blue,
    epic: C.purple,
    legendary: C.orange,
  };
  return (
    <View>
      <Text style={styles.sectionLabel}>Recent drops</Text>
      {recent.map((item, i) => (
        <View key={item.id + i} style={styles.lootRow}>
          <Text
            style={[
              styles.lootRarity,
              { color: RARITY_COLOR[item.rarity] ?? C.textMuted },
            ]}
          >
            ◆
          </Text>
          <Text style={styles.lootName}>
            {item.templateId.replace(/_/g, ' ')}
          </Text>
          <Text
            style={[
              styles.lootRarityLabel,
              { color: RARITY_COLOR[item.rarity] ?? C.textMuted },
            ]}
          >
            {item.rarity}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function FarmScreen() {
  const {
    farmState,
    offlineSummary,
    isLoaded,
    sessionResources,
    sessionItems,
    deployHero,
    undeployHero,
    claimOfflineLoot,
  } = useFarmLoop();

  const [lastResult, setLastResult] = useState<FarmResult | null>(null);
  const prevItemCount = useRef(sessionItems.length);

  React.useEffect(() => {
    if (sessionItems.length > prevItemCount.current) {
      setLastResult({
        durationSeconds: 60,
        resources: sessionResources,
        items: sessionItems.slice(prevItemCount.current),
        rollCount: 1,
      });
    }
    prevItemCount.current = sessionItems.length;
  }, [sessionItems.length]);

  const hero = farmState.deployedHero;
  const eligibleZones = getEligibleZones(MOCK_HERO.combatPower);
  const currentZone = hero
    ? (FARM_ZONES.find((z) => z.id === hero.zoneId) ?? null)
    : null;

  const handleDeploy = useCallback(
    (zone: FarmZone) => {
      try {
        deployHero({ ...MOCK_HERO, zoneId: zone.id }, zone);
      } catch (e: any) {
        console.warn('Deploy failed:', e.message);
      }
    },
    [deployHero],
  );

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FarmScene hero={hero} zone={currentZone} lastResult={lastResult} />

      {offlineSummary && (
        <OfflineBanner
          heroName={offlineSummary.heroName}
          zoneName={offlineSummary.zoneName}
          durationSeconds={offlineSummary.durationSeconds}
          wasCapped={offlineSummary.wasCapped}
          resources={offlineSummary.result.resources}
          items={offlineSummary.result.items}
          onClaim={claimOfflineLoot}
        />
      )}

      {hero && currentZone ? (
        <HeroCard
          hero={hero}
          zone={currentZone}
          sessionGold={sessionResources.gold}
          onUndeploy={undeployHero}
        />
      ) : (
        <View style={styles.noHero}>
          <Text style={styles.noHeroText}>No hero deployed</Text>
          <Text style={styles.noHeroSub}>
            Select a zone below to start farming
          </Text>
        </View>
      )}

      <ZoneSelector
        eligibleZones={eligibleZones}
        currentZoneId={hero?.zoneId}
        onSelect={handleDeploy}
      />

      <LootFeed items={sessionItems} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { gap: 12, paddingBottom: 48 },
  loader: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
  },
  offlineBanner: {
    backgroundColor: C.surfaceHigh,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.gold + '44',
    gap: 8,
  },
  offlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  offlineCap: { fontSize: 12, color: C.orange },
  offlineSub: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
  offlineLoot: { gap: 4 },
  offlineLootItem: { fontSize: 14, color: C.textMuted },
  claimBtn: {
    backgroundColor: C.gold,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  claimBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },
  heroCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple + '33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.purple + '88',
  },
  heroAvatarText: { fontSize: 22, color: C.purple },
  heroInfo: { flex: 1, gap: 2 },
  heroName: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  heroStars: { fontSize: 12, color: C.gold },
  heroLevel: { fontSize: 12, color: C.textMuted },
  recallBtn: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  recallBtnText: { fontSize: 13, color: C.textMuted },
  zonePill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zonePillText: { fontSize: 13, color: C.textMuted },
  zonePillGph: { fontSize: 13, color: C.gold },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLabel: { fontSize: 13, color: C.textMuted },
  sessionGold: { fontSize: 16, fontWeight: '600', color: C.gold },
  noHero: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 6,
  },
  noHeroText: { fontSize: 15, color: C.textMuted },
  noHeroSub: { fontSize: 12, color: C.textMuted, opacity: 0.6 },
  zoneCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneCardActive: { borderColor: '#4ADE8088', backgroundColor: '#4ADE8011' },
  zoneCardLocked: { opacity: 0.5 },
  zoneName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  zoneDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  zoneStats: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  lockIcon: { fontSize: 18 },
  lootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    marginHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  lootRarity: { fontSize: 10 },
  lootName: {
    flex: 1,
    fontSize: 13,
    color: C.textPrimary,
    textTransform: 'capitalize',
  },
  lootRarityLabel: { fontSize: 11 },
});
