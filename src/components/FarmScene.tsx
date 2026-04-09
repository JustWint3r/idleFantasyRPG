// ─────────────────────────────────────────────────────────────
//  FarmScene.tsx
//  AFK-style farming scene.
//  Hero stands on the left. Enemy spawns fixed on the right.
//  Hero charges, plays attack video fullscreen, returns to home.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeployedHero, FarmResult, FarmZone } from '../types/farm.types';
import { HERO_ROSTER } from '../data/heroRoster.data';

const { width: SCREEN_W } = Dimensions.get('window');
const SCENE_H = 280;

const HERO_HOME_X = 30;
const ENEMY_X = SCREEN_W - 90;

// ── Zone themes ───────────────────────────────────────────────

interface ZoneTheme {
  skyColor: string;
  groundColor: string;
  groundLineColor: string;
  treeTrunk: string;
  treeLeaves: string;
  fogColor: string;
  enemyEmoji: string;
  particleColor: string;
}

const ZONE_THEMES: Record<string, ZoneTheme> = {
  zone_meadow: {
    skyColor: '#1A2744', groundColor: '#1B3A2A', groundLineColor: '#2A5A3A',
    treeTrunk: '#3B2A1A', treeLeaves: '#2D5A3A', fogColor: '#1A2744',
    enemyEmoji: '🐺', particleColor: '#F5C842',
  },
  zone_darkwood: {
    skyColor: '#0D1520', groundColor: '#1A2A1A', groundLineColor: '#243524',
    treeTrunk: '#2A1A0A', treeLeaves: '#1A3020', fogColor: '#0D1520',
    enemyEmoji: '👹', particleColor: '#A78BFA',
  },
  zone_dragon_peaks: {
    skyColor: '#1A0D0D', groundColor: '#2A1A0A', groundLineColor: '#3A2A1A',
    treeTrunk: '#3A2A1A', treeLeaves: '#4A1A0A', fogColor: '#1A0D0D',
    enemyEmoji: '🐉', particleColor: '#FB923C',
  },
};

const DEFAULT_THEME = ZONE_THEMES['zone_meadow'];

// ── Types ─────────────────────────────────────────────────────

interface LootPopup {
  id: number; text: string; color: string; x: number;
  anim: Animated.Value; opacity: Animated.Value;
}

interface FarmSceneProps {
  hero: DeployedHero | null;
  zone: FarmZone | null;
  lastResult: FarmResult | null;
}

// ── Tree ──────────────────────────────────────────────────────

function Tree({ x, h, theme }: { x: number; h: number; theme: ZoneTheme }) {
  const trunkH = h * 0.35;
  const leavesH = h * 0.7;
  const leavesW = h * 0.55;
  return (
    <View style={[styles.treeWrap, { left: x }]} pointerEvents="none">
      <View style={[styles.treeLeaves, {
        width: leavesW, height: leavesH, borderRadius: leavesW / 2,
        backgroundColor: theme.treeLeaves, marginLeft: -(leavesW / 2 - 5),
      }]} />
      <View style={[styles.treeTrunk, { height: trunkH, backgroundColor: theme.treeTrunk }]} />
    </View>
  );
}

// ── Hero sprite (idle or attacking) ──────────────────────────

function HeroSprite({ heroId, heroName, isAttacking }: {
  heroId: string; heroName: string; isAttacking: boolean;
}) {
  const template = HERO_ROSTER.find((t) => t.id === heroId);
  if (template?.image) {
    // Use attackVideo (APNG) when attacking — same size as static image
    const src = (isAttacking && template.attackVideo) ? template.attackVideo : template.image;
    return (
      <View style={styles.heroSprite}>
        <Image source={src} style={styles.heroImage} resizeMode="contain" />
      </View>
    );
  }
  const initial = heroName.charAt(0).toUpperCase();
  return (
    <View style={styles.heroSprite}>
      <View style={[styles.heroBody, isAttacking && styles.heroBodyAttack]}>
        <Text style={styles.heroInitial}>{initial}</Text>
      </View>
      <View style={[styles.heroWeapon, styles.heroWeaponRight, isAttacking && styles.heroWeaponAttack]} />
      <View style={styles.heroShadow} />
    </View>
  );
}

// ── Enemy sprite ──────────────────────────────────────────────

function EnemySprite({ emoji, opacity, scale }: {
  emoji: string; opacity: Animated.Value; scale: Animated.Value;
}) {
  return (
    <Animated.View style={[styles.enemySprite, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.enemyEmoji}>{emoji}</Text>
      <View style={styles.enemyShadow} />
    </Animated.View>
  );
}

// ── Main scene ────────────────────────────────────────────────

export default function FarmScene({ hero, zone, lastResult }: FarmSceneProps) {
  const theme = zone ? (ZONE_THEMES[zone.id] ?? DEFAULT_THEME) : DEFAULT_THEME;

  const heroX = useRef(new Animated.Value(HERO_HOME_X)).current;
  const [enemyVisible, setEnemyVisible] = useState(false);
  const enemyOpacity = useRef(new Animated.Value(0)).current;
  const enemyScale  = useRef(new Animated.Value(0.5)).current;
  const [isAttacking, setIsAttacking] = useState(false);
  const isBusy = useRef(false);

  const [popups, setPopups] = useState<LootPopup[]>([]);
  const popupId = useRef(0);

  const template = hero ? HERO_ROSTER.find((t) => t.id === hero.id) : null;
  const hasRealImage = !!template?.image;

  // ── Hit particles ───────────────────────────────────────────

  const spawnHitParticles = useCallback((color: string) => {
    const id = popupId.current++;
    const anim = new Animated.Value(0);
    const opacity = new Animated.Value(1);
    setPopups((prev) => [...prev, { id, text: '⚡', color, x: ENEMY_X, anim, opacity }]);
    Animated.parallel([
      Animated.timing(anim,    { toValue: -40, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,   duration: 600, useNativeDriver: true }),
    ]).start(() => setPopups((prev) => prev.filter((p) => p.id !== id)));
  }, []);

  // ── Combat sequence ─────────────────────────────────────────

  const runCombat = useCallback(() => {
    if (!hero || isBusy.current) return;
    isBusy.current = true;

    // 1. Enemy appears on right
    setEnemyVisible(true);
    enemyOpacity.setValue(0);
    enemyScale.setValue(0.5);
    Animated.parallel([
      Animated.timing(enemyOpacity, { toValue: 1,  duration: 300, useNativeDriver: true }),
      Animated.spring(enemyScale,   { toValue: 1,  friction: 5,   useNativeDriver: true }),
    ]).start();

    // 2. After pause, hero charges right
    setTimeout(() => {
      const attackPos = ENEMY_X - 60;
      Animated.timing(heroX, {
        toValue: attackPos, duration: 500,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start(() => {

        // 3. Show attack video overlay (fullscreen)
        setIsAttacking(true);

        // 4. Enemy dies while attack plays
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(enemyOpacity, { toValue: 0,   duration: 250, useNativeDriver: true }),
            Animated.timing(enemyScale,   { toValue: 1.8, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            setEnemyVisible(false);
            enemyScale.setValue(0.5);
            setIsAttacking(false);
            spawnHitParticles(theme.particleColor);

            // 5. Hero walks back home
            Animated.timing(heroX, {
              toValue: HERO_HOME_X, duration: 500,
              easing: Easing.inOut(Easing.quad), useNativeDriver: true,
            }).start(() => { isBusy.current = false; });
          });
        }, 800);
      });
    }, 500);
  }, [hero, heroX, enemyOpacity, enemyScale, spawnHitParticles, theme]);

  // ── Loot popups ─────────────────────────────────────────────

  useEffect(() => {
    if (!lastResult) return;
    const { resources, items } = lastResult;
    const toShow: { text: string; color: string }[] = [];
    if (resources.gold > 0)          toShow.push({ text: `+${Math.floor(resources.gold)} gp`, color: '#F5C842' });
    if (resources.xpBooks > 0)       toShow.push({ text: `+${resources.xpBooks} XP`,          color: '#60A5FA' });
    if (resources.summonScrolls > 0) toShow.push({ text: `+${resources.summonScrolls} scroll`, color: '#A78BFA' });
    items.forEach((item) => toShow.push({ text: `⚔ ${item.rarity}`, color: theme.particleColor }));
    toShow.forEach((loot, i) => {
      setTimeout(() => {
        const id = popupId.current++;
        const anim = new Animated.Value(0);
        const opacity = new Animated.Value(1);
        const x = 60 + Math.random() * (SCREEN_W - 160);
        setPopups((prev) => [...prev, { id, text: loot.text, color: loot.color, x, anim, opacity }]);
        Animated.parallel([
          Animated.timing(anim, { toValue: -55, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]).start(() => setPopups((prev) => prev.filter((p) => p.id !== id)));
      }, i * 200);
    });
  }, [lastResult]);

  // ── Start combat loop ───────────────────────────────────────

  useEffect(() => {
    if (!hero) return;
    heroX.setValue(HERO_HOME_X);
    isBusy.current = false;
    const timer = setInterval(runCombat, 4500);
    return () => { clearInterval(timer); heroX.stopAnimation(); isBusy.current = false; };
  }, [hero?.id, zone?.id]);

  // ── Trees ───────────────────────────────────────────────────

  const trees = useRef([
    { x: 15, h: 80 }, { x: SCREEN_W * 0.2, h: 100 }, { x: SCREEN_W * 0.45, h: 70 },
    { x: SCREEN_W * 0.65, h: 90 }, { x: SCREEN_W * 0.82, h: 75 }, { x: SCREEN_W - 40, h: 85 },
  ]).current;

  // ── Render ──────────────────────────────────────────────────

  if (!hero || !zone) {
    return (
      <View style={[styles.scene, { backgroundColor: '#0D1520' }]}>
        <View style={styles.emptyScene}>
          <Text style={styles.emptyText}>No hero deployed</Text>
          <Text style={styles.emptySubText}>Select a zone below to start farming</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.scene, { backgroundColor: theme.skyColor }]}>

      {/* Background trees */}
      {trees.map((t, i) => (
        <View key={i} style={[styles.treeFarWrap, { bottom: 65 }]}>
          <Tree x={t.x} h={t.h * 0.6} theme={theme} />
        </View>
      ))}

      {/* Ground */}
      <View style={[styles.ground, { backgroundColor: theme.groundColor, borderTopColor: theme.groundLineColor }]} />

      {/* Foreground trees */}
      {trees.filter((_, i) => i % 2 === 0).map((t, i) => (
        <View key={i} style={[styles.treeForeWrap, { bottom: 62 }]}>
          <Tree x={t.x - 20} h={t.h} theme={theme} />
        </View>
      ))}

      {/* Enemy */}
      {enemyVisible && (
        <View style={[styles.entityWrap, { bottom: 62, left: ENEMY_X }]}>
          <EnemySprite emoji={theme.enemyEmoji} opacity={enemyOpacity} scale={enemyScale} />
        </View>
      )}

      {/* Hero */}
      <Animated.View style={[styles.entityWrap, {
        bottom: hasRealImage ? 48 : 68,
        transform: [{ translateX: heroX }],
      }]}>
        <HeroSprite heroId={hero.id} heroName={hero.name} isAttacking={isAttacking} />
      </Animated.View>

      {/* Loot popups — always on top */}
      {popups.map((p) => (
        <Animated.View key={p.id} pointerEvents="none"
          style={[styles.lootPopup, { left: p.x, transform: [{ translateY: p.anim }], opacity: p.opacity }]}
        >
          <Text style={[styles.lootPopupText, { color: p.color }]}>{p.text}</Text>
        </Animated.View>
      ))}

      {/* Fog vignette */}
      <View style={[styles.fogLeft,  { backgroundColor: theme.fogColor }]} pointerEvents="none" />
      <View style={[styles.fogRight, { backgroundColor: theme.fogColor }]} pointerEvents="none" />

      {/* Zone tag */}
      <View style={styles.zoneTag}>
        <Text style={styles.zoneTagText}>{zone.name}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scene: { width: '100%', height: SCENE_H, overflow: 'hidden', position: 'relative' },
  emptyScene: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText: { fontSize: 15, color: '#7B7699' },
  emptySubText: { fontSize: 12, color: '#4A4868' },

  ground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, borderTopWidth: 2 },

  treeFarWrap: { position: 'absolute', opacity: 0.5 },
  treeForeWrap: { position: 'absolute' },
  treeWrap: { position: 'absolute', alignItems: 'center', bottom: 0 },
  treeLeaves: {},
  treeTrunk: { width: 10, borderRadius: 2 },

  entityWrap: { position: 'absolute' },

  // Attack video fills the entire scene
  attackOverlay: {
    position: 'absolute', top: 0, left: 0,
    width: SCREEN_W, height: SCENE_H,
    zIndex: 10,
  },

  heroSprite: { alignItems: 'center' },
  // Size to match PNG content — adjust height to clip bottom whitespace
  heroImage: { width: 100, height: 150 },

  // Fallback letter avatar
  heroBody: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4A3A7A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#7B6AAA',
  },
  heroBodyAttack: { backgroundColor: '#6A3AAA', borderColor: '#F5C842' },
  heroInitial: { fontSize: 20, color: '#EDE8FF', fontWeight: '700' },
  heroWeapon: { position: 'absolute', width: 4, height: 22, backgroundColor: '#9CA3AF', borderRadius: 2, top: 10 },
  heroWeaponRight: { right: -6 },
  heroWeaponAttack: { backgroundColor: '#F5C842', height: 26 },
  heroShadow: { width: 40, height: 6, borderRadius: 20, backgroundColor: '#00000055', marginTop: 2 },

  enemySprite: { alignItems: 'center' },
  enemyEmoji: { fontSize: 36 },
  enemyShadow: { width: 28, height: 5, borderRadius: 14, backgroundColor: '#00000055', marginTop: 1 },

  lootPopup: { position: 'absolute', bottom: 100, zIndex: 20 },
  lootPopupText: { fontSize: 13, fontWeight: '700' },

  fogLeft:  { position: 'absolute', left: 0,  top: 0, bottom: 0, width: 30, opacity: 0.7 },
  fogRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 30, opacity: 0.7 },

  zoneTag: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#00000055', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 0.5, borderColor: '#FFFFFF22',
  },
  zoneTagText: { fontSize: 11, color: '#FFFFFFAA', letterSpacing: 0.5 },
});
