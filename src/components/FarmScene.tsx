// ─────────────────────────────────────────────────────────────
//  FarmScene.tsx
//  AFK Arena-style animated farming scene.
//  Hero walks the zone, fights enemies, loot floats up on drops.
//  Uses only React Native's built-in Animated API — no reanimated.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeployedHero, FarmResult, FarmZone } from '../types/farm.types';

const { width: SCREEN_W } = Dimensions.get('window');
const SCENE_H = 280;

// ── Zone themes ───────────────────────────────────────────────

interface ZoneTheme {
  skyColor: string;
  groundColor: string;
  groundLineColor: string;
  treeTrunk: string;
  treeLeaves: string;
  fogColor: string;
  enemyEmoji: string;
  enemyColor: string;
  particleColor: string;
}

const ZONE_THEMES: Record<string, ZoneTheme> = {
  zone_meadow: {
    skyColor: '#1A2744',
    groundColor: '#1B3A2A',
    groundLineColor: '#2A5A3A',
    treeTrunk: '#3B2A1A',
    treeLeaves: '#2D5A3A',
    fogColor: '#1A2744',
    enemyEmoji: '🐺',
    enemyColor: '#8B4513',
    particleColor: '#F5C842',
  },
  zone_darkwood: {
    skyColor: '#0D1520',
    groundColor: '#1A2A1A',
    groundLineColor: '#243524',
    treeTrunk: '#2A1A0A',
    treeLeaves: '#1A3020',
    fogColor: '#0D1520',
    enemyEmoji: '👹',
    enemyColor: '#4A2040',
    particleColor: '#A78BFA',
  },
  zone_dragon_peaks: {
    skyColor: '#1A0D0D',
    groundColor: '#2A1A0A',
    groundLineColor: '#3A2A1A',
    treeTrunk: '#3A2A1A',
    treeLeaves: '#4A1A0A',
    fogColor: '#1A0D0D',
    enemyEmoji: '🐉',
    enemyColor: '#8B0000',
    particleColor: '#FB923C',
  },
};

const DEFAULT_THEME = ZONE_THEMES['zone_meadow'];

// ── Loot popup ────────────────────────────────────────────────

interface LootPopup {
  id: number;
  text: string;
  color: string;
  x: number;
  anim: Animated.Value;
  opacity: Animated.Value;
}

// ── Types ─────────────────────────────────────────────────────

interface FarmSceneProps {
  hero: DeployedHero | null;
  zone: FarmZone | null;
  lastResult: FarmResult | null; // pass a new result to trigger loot popup
}

// ── Tree component ────────────────────────────────────────────

function Tree({ x, h, theme }: { x: number; h: number; theme: ZoneTheme }) {
  const trunkH = h * 0.35;
  const leavesH = h * 0.7;
  const leavesW = h * 0.55;
  return (
    <View style={[styles.treeWrap, { left: x }]} pointerEvents="none">
      <View
        style={[
          styles.treeLeaves,
          {
            width: leavesW,
            height: leavesH,
            borderRadius: leavesW / 2,
            backgroundColor: theme.treeLeaves,
            marginLeft: -(leavesW / 2 - 5),
          },
        ]}
      />
      <View
        style={[
          styles.treeTrunk,
          {
            height: trunkH,
            backgroundColor: theme.treeTrunk,
          },
        ]}
      />
    </View>
  );
}

// ── Hero sprite ───────────────────────────────────────────────

function HeroSprite({
  facing,
  isAttacking,
  heroName,
}: {
  facing: 'left' | 'right';
  isAttacking: boolean;
  heroName: string;
}) {
  const initial = heroName.charAt(0).toUpperCase();
  return (
    <View style={styles.heroSprite}>
      {/* Glow ring when attacking */}
      {isAttacking && <View style={styles.heroGlow} />}
      {/* Body */}
      <View style={[styles.heroBody, isAttacking && styles.heroBodyAttack]}>
        <Text
          style={[
            styles.heroInitial,
            { transform: [{ scaleX: facing === 'left' ? -1 : 1 }] },
          ]}
        >
          {initial}
        </Text>
      </View>
      {/* Weapon */}
      <View
        style={[
          styles.heroWeapon,
          facing === 'left' ? styles.heroWeaponLeft : styles.heroWeaponRight,
          isAttacking && styles.heroWeaponAttack,
        ]}
      />
      {/* Shadow */}
      <View style={styles.heroShadow} />
    </View>
  );
}

// ── Enemy sprite ──────────────────────────────────────────────

function EnemySprite({
  emoji,
  opacity,
  scale,
}: {
  emoji: string;
  opacity: Animated.Value;
  scale: Animated.Value;
}) {
  return (
    <Animated.View
      style={[styles.enemySprite, { opacity, transform: [{ scale }] }]}
    >
      <Text style={styles.enemyEmoji}>{emoji}</Text>
      <View style={styles.enemyShadow} />
    </Animated.View>
  );
}

// ── Main scene ────────────────────────────────────────────────

export default function FarmScene({ hero, zone, lastResult }: FarmSceneProps) {
  const theme = zone ? (ZONE_THEMES[zone.id] ?? DEFAULT_THEME) : DEFAULT_THEME;

  // Hero position (x, 0=left edge of scene)
  const heroX = useRef(new Animated.Value(60)).current;
  const heroDir = useRef<'left' | 'right'>('right');
  const heroPos = useRef(60);

  // Enemy state
  const [enemyVisible, setEnemyVisible] = useState(false);
  const [enemyPos, setEnemyPos] = useState(SCREEN_W - 100);
  const enemyOpacity = useRef(new Animated.Value(0)).current;
  const enemyScale = useRef(new Animated.Value(0.5)).current;
  const [isAttacking, setIsAttacking] = useState(false);

  // Loot popups
  const [popups, setPopups] = useState<LootPopup[]>([]);
  const popupId = useRef(0);

  // Bob animation for idle
  const bobAnim = useRef(new Animated.Value(0)).current;

  // ── Hero walk loop ──────────────────────────────────────────

  const walkHero = useCallback(() => {
    const targetX = heroDir.current === 'right' ? SCREEN_W * 0.55 : 40;
    const distance = Math.abs(targetX - heroPos.current);
    const duration = distance * 5.5;

    Animated.timing(heroX, {
      toValue: targetX,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      heroPos.current = targetX;
      heroDir.current = heroDir.current === 'right' ? 'left' : 'right';
      walkHero();
    });
  }, [heroX]);

  // ── Bob (idle breathe) ──────────────────────────────────────

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -3,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bobAnim]);

  // ── Enemy spawn loop ────────────────────────────────────────

  const spawnEnemy = useCallback(() => {
    if (!hero) return;

    const spawnX = heroDir.current === 'right' ? SCREEN_W - 80 : 20;
    setEnemyPos(spawnX);
    setEnemyVisible(true);

    Animated.parallel([
      Animated.timing(enemyOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(enemyScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Hero rushes to enemy, attacks, enemy dies
    setTimeout(() => {
      heroX.stopAnimation();
      const attackTarget = spawnX > SCREEN_W / 2 ? spawnX - 55 : spawnX + 55;
      heroDir.current = spawnX > SCREEN_W / 2 ? 'right' : 'left';

      Animated.timing(heroX, {
        toValue: attackTarget,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        heroPos.current = attackTarget;
        setIsAttacking(true);

        // Enemy dies
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(enemyOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(enemyScale, {
              toValue: 2,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setEnemyVisible(false);
            enemyScale.setValue(0.5);
            setIsAttacking(false);

            // Spawn hit particles
            spawnHitParticles(attackTarget, theme.particleColor);

            // Resume walk
            setTimeout(walkHero, 400);
          });
        }, 350);
      });
    }, 800);
  }, [hero, heroX, enemyOpacity, enemyScale, walkHero, theme]);

  // ── Hit particles ───────────────────────────────────────────

  const spawnHitParticles = (x: number, color: string) => {
    const id = popupId.current++;
    const anim = new Animated.Value(0);
    const opacity = new Animated.Value(1);

    setPopups((prev) => [...prev, { id, text: '⚡', color, x, anim, opacity }]);

    Animated.parallel([
      Animated.timing(anim, {
        toValue: -40,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    });
  };

  // ── Loot popups from farm result ────────────────────────────

  useEffect(() => {
    if (!lastResult) return;
    const { resources, items } = lastResult;

    const toShow: { text: string; color: string }[] = [];
    if (resources.gold > 0)
      toShow.push({
        text: `+${Math.floor(resources.gold)} gp`,
        color: '#F5C842',
      });
    if (resources.xpBooks > 0)
      toShow.push({ text: `+${resources.xpBooks} XP`, color: '#60A5FA' });
    if (resources.summonScrolls > 0)
      toShow.push({
        text: `+${resources.summonScrolls} scroll`,
        color: '#A78BFA',
      });
    items.forEach((item) =>
      toShow.push({ text: `⚔ ${item.rarity}`, color: theme.particleColor }),
    );

    toShow.forEach((loot, i) => {
      setTimeout(() => {
        const id = popupId.current++;
        const anim = new Animated.Value(0);
        const opacity = new Animated.Value(1);
        const x = 60 + Math.random() * (SCREEN_W - 160);

        setPopups((prev) => [
          ...prev,
          { id, text: loot.text, color: loot.color, x, anim, opacity },
        ]);

        Animated.parallel([
          Animated.timing(anim, {
            toValue: -55,
            duration: 1200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setPopups((prev) => prev.filter((p) => p.id !== id));
        });
      }, i * 200);
    });
  }, [lastResult]);

  // ── Start loops when hero is deployed ──────────────────────

  useEffect(() => {
    if (!hero) return;
    walkHero();

    const enemyTimer = setInterval(spawnEnemy, 4500);
    return () => {
      clearInterval(enemyTimer);
      heroX.stopAnimation();
    };
  }, [hero?.id, zone?.id]);

  // ── Trees (stable, memoised positions) ─────────────────────

  const trees = useRef([
    { x: 15, h: 80 },
    { x: SCREEN_W * 0.2, h: 100 },
    { x: SCREEN_W * 0.45, h: 70 },
    { x: SCREEN_W * 0.65, h: 90 },
    { x: SCREEN_W * 0.82, h: 75 },
    { x: SCREEN_W - 40, h: 85 },
  ]).current;

  const groundY = SCENE_H - 70;

  // ── Render ──────────────────────────────────────────────────

  if (!hero || !zone) {
    return (
      <View style={[styles.scene, { backgroundColor: '#0D1520' }]}>
        <View style={styles.emptyScene}>
          <Text style={styles.emptyText}>No hero deployed</Text>
          <Text style={styles.emptySubText}>
            Select a zone below to start farming
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.scene, { backgroundColor: theme.skyColor }]}>
      {/* Background trees (far) */}
      {trees.map((t, i) => (
        <View key={i} style={[styles.treeFarWrap, { bottom: 65 }]}>
          <Tree x={t.x} h={t.h * 0.6} theme={theme} />
        </View>
      ))}

      {/* Ground */}
      <View
        style={[
          styles.ground,
          {
            backgroundColor: theme.groundColor,
            borderTopColor: theme.groundLineColor,
          },
        ]}
      />

      {/* Foreground trees */}
      {trees
        .filter((_, i) => i % 2 === 0)
        .map((t, i) => (
          <View key={i} style={[styles.treeForeWrap, { bottom: 62 }]}>
            <Tree x={t.x - 20} h={t.h} theme={theme} />
          </View>
        ))}

      {/* Enemy */}
      {enemyVisible && (
        <View style={[styles.entityWrap, { bottom: 68, left: enemyPos }]}>
          <EnemySprite
            emoji={theme.enemyEmoji}
            opacity={enemyOpacity}
            scale={enemyScale}
          />
        </View>
      )}

      {/* Hero */}
      <Animated.View
        style={[
          styles.entityWrap,
          {
            bottom: 68,
            transform: [{ translateX: heroX }, { translateY: bobAnim }],
          },
        ]}
      >
        <HeroSprite
          facing={heroDir.current}
          isAttacking={isAttacking}
          heroName={hero.name}
        />
      </Animated.View>

      {/* Loot popups */}
      {popups.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            styles.lootPopup,
            {
              left: p.x,
              transform: [{ translateY: p.anim }],
              opacity: p.opacity,
            },
          ]}
        >
          <Text style={[styles.lootPopupText, { color: p.color }]}>
            {p.text}
          </Text>
        </Animated.View>
      ))}

      {/* Fog vignette (left + right) */}
      <View
        style={[styles.fogLeft, { backgroundColor: theme.fogColor }]}
        pointerEvents="none"
      />
      <View
        style={[styles.fogRight, { backgroundColor: theme.fogColor }]}
        pointerEvents="none"
      />

      {/* Zone name tag */}
      <View style={styles.zoneTag}>
        <Text style={styles.zoneTagText}>{zone.name}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    height: SCENE_H,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyScene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: { fontSize: 15, color: '#7B7699' },
  emptySubText: { fontSize: 12, color: '#4A4868' },

  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    borderTopWidth: 2,
  },

  treeFarWrap: { position: 'absolute', opacity: 0.5 },
  treeForeWrap: { position: 'absolute' },
  treeWrap: { position: 'absolute', alignItems: 'center', bottom: 0 },
  treeLeaves: {},
  treeTrunk: { width: 10, borderRadius: 2 },

  entityWrap: { position: 'absolute' },

  heroSprite: { alignItems: 'center', position: 'relative' },
  heroGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5C84244',
    top: -5,
  },
  heroBody: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A3A7A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7B6AAA',
  },
  heroBodyAttack: { backgroundColor: '#6A3AAA', borderColor: '#F5C842' },
  heroInitial: { fontSize: 20, color: '#EDE8FF', fontWeight: '700' },
  heroWeapon: {
    position: 'absolute',
    width: 4,
    height: 22,
    backgroundColor: '#9CA3AF',
    borderRadius: 2,
    top: 10,
  },
  heroWeaponLeft: { left: -6 },
  heroWeaponRight: { right: -6 },
  heroWeaponAttack: { backgroundColor: '#F5C842', height: 26 },
  heroShadow: {
    width: 30,
    height: 6,
    borderRadius: 15,
    backgroundColor: '#00000055',
    marginTop: 2,
  },

  enemySprite: { alignItems: 'center' },
  enemyEmoji: { fontSize: 32 },
  enemyShadow: {
    width: 24,
    height: 5,
    borderRadius: 12,
    backgroundColor: '#00000055',
    marginTop: 1,
  },

  lootPopup: { position: 'absolute', bottom: 100 },
  lootPopupText: { fontSize: 13, fontWeight: '700' },

  fogLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    opacity: 0.7,
  },
  fogRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    opacity: 0.7,
  },

  zoneTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#00000055',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#FFFFFF22',
  },
  zoneTagText: { fontSize: 11, color: '#FFFFFFAA', letterSpacing: 0.5 },
});
