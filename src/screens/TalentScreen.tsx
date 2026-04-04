// ─────────────────────────────────────────────────────────────
//  TalentScreen.tsx
//  Linear talent tree per hero — 4 branches, 5 tiers each.
//  Hero selector at top, branch columns below, tap to unlock.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTalent } from '../context/TalentContext';
import {
  BRANCH_COLORS,
  BRANCH_LABELS,
  type TalentBranch,
  type TalentNode,
} from '../types/talent.types';
import {
  canUnlock,
  calcTalentBonuses,
  calcTalentCp,
  getHeroTalents,
  NODES_BY_BRANCH,
  TALENT_NODES,
} from '../engine/talentEngine';

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
} as const;

// ── Mock heroes ───────────────────────────────────────────────

const HEROES = [
  { id: 'hero_001', name: 'Aria the Swift', initial: 'A', color: '#A78BFA' },
  { id: 'hero_002', name: 'Kael Ironforge', initial: 'K', color: '#60A5FA' },
  { id: 'hero_003', name: 'Seraphine', initial: 'S', color: '#F87171' },
];

const BRANCHES: TalentBranch[] = ['atk', 'def', 'hp', 'utility'];

// ── Node card ─────────────────────────────────────────────────

function NodeCard({
  node,
  status,
  onPress,
}: {
  node: TalentNode;
  status: 'unlocked' | 'available' | 'locked';
  onPress: () => void;
}) {
  const color = BRANCH_COLORS[node.branch];
  const isMastery = node.tier === 5;

  return (
    <Pressable
      style={[
        styles.nodeCard,
        status === 'unlocked' && {
          borderColor: color,
          borderWidth: 2,
          backgroundColor: color + '22',
        },
        status === 'available' && { borderColor: color, borderWidth: 1.5 },
        status === 'locked' && { opacity: 0.4 },
        isMastery && { borderRadius: 12 },
      ]}
      onPress={onPress}
      disabled={status === 'locked'}
    >
      {status === 'unlocked' && (
        <View style={[styles.checkBadge, { backgroundColor: color }]}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      <Text
        style={[styles.nodeName, status === 'unlocked' && { color }]}
        numberOfLines={1}
      >
        {node.name}
      </Text>
      <Text style={styles.nodeDesc} numberOfLines={2}>
        {node.description}
      </Text>
      <Text
        style={[
          styles.nodeCost,
          { color: status === 'available' ? C.gold : C.textMuted },
        ]}
      >
        {node.cost} {node.cost === 1 ? 'pt' : 'pts'}
      </Text>
    </Pressable>
  );
}

// ── Confirm modal ─────────────────────────────────────────────

function ConfirmModal({
  node,
  points,
  onConfirm,
  onClose,
}: {
  node: TalentNode;
  points: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const color = BRANCH_COLORS[node.branch];
  const canAfford = points >= node.cost;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={[styles.modalBranch, { color }]}>
          {BRANCH_LABELS[node.branch]} Branch — Tier {node.tier}
        </Text>
        <Text style={styles.modalTitle}>{node.name}</Text>
        <Text style={styles.modalDesc}>{node.description}</Text>

        <View style={styles.modalCostRow}>
          <Text style={styles.modalCostLabel}>Cost</Text>
          <Text
            style={[
              styles.modalCostVal,
              { color: canAfford ? C.gold : '#F87171' },
            ]}
          >
            {node.cost} talent {node.cost === 1 ? 'point' : 'points'}
          </Text>
        </View>
        <View style={styles.modalCostRow}>
          <Text style={styles.modalCostLabel}>You have</Text>
          <Text style={styles.modalCostVal}>{points} pts</Text>
        </View>
        <View style={styles.modalCostRow}>
          <Text style={styles.modalCostLabel}>After unlock</Text>
          <Text style={styles.modalCostVal}>{points - node.cost} pts</Text>
        </View>

        <Pressable
          style={[
            styles.confirmBtn,
            { backgroundColor: canAfford ? color : C.border },
          ]}
          onPress={canAfford ? onConfirm : undefined}
          disabled={!canAfford}
        >
          <Text
            style={[
              styles.confirmBtnText,
              { color: canAfford ? C.bg : C.textMuted },
            ]}
          >
            {canAfford ? 'Unlock' : 'Not enough points'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Branch column ─────────────────────────────────────────────

function BranchColumn({
  branch,
  heroId,
  heroTalents,
  talentState,
  onNodePress,
}: {
  branch: TalentBranch;
  heroId: string;
  heroTalents: ReturnType<typeof getHeroTalents>;
  talentState: import('../types/talent.types').TalentState;
  onNodePress: (node: TalentNode) => void;
}) {
  const nodes = NODES_BY_BRANCH[branch] ?? [];
  const color = BRANCH_COLORS[branch];

  return (
    <View style={styles.branchCol}>
      <View style={[styles.branchHeader, { borderBottomColor: color }]}>
        <Text style={[styles.branchLabel, { color }]}>
          {BRANCH_LABELS[branch]}
        </Text>
      </View>
      {nodes.map((node, i) => {
        const unlocked = heroTalents.unlockedNodes.includes(node.id);
        const available = !unlocked && canUnlock(node, heroTalents);
        const status = unlocked
          ? 'unlocked'
          : available
            ? 'available'
            : 'locked';

        return (
          <View key={node.id}>
            <NodeCard
              node={node}
              status={status}
              onPress={() => onNodePress(node)}
            />
            {i < nodes.length - 1 && (
              <View
                style={[
                  styles.connector,
                  unlocked && { backgroundColor: color },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function TalentScreen() {
  const { talentState, unlock, getBonuses, getTalentCp, getPoints } =
    useTalent();

  const [heroIndex, setHeroIndex] = useState(0);
  const [pendingNode, setPendingNode] = useState<TalentNode | null>(null);

  const hero = HEROES[heroIndex];
  const heroState = getHeroTalents(talentState, hero.id);
  const bonuses = getBonuses(hero.id);
  const talentCp = getTalentCp(hero.id);
  const points = getPoints(hero.id);

  function handleConfirm() {
    if (!pendingNode) return;
    unlock(hero.id, pendingNode.id);
    setPendingNode(null);
  }

  return (
    <View style={styles.screen}>
      {/* Hero selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.heroBar}
        contentContainerStyle={styles.heroBarContent}
      >
        {HEROES.map((h, i) => (
          <Pressable
            key={h.id}
            style={[
              styles.heroChip,
              i === heroIndex && {
                borderColor: h.color,
                backgroundColor: h.color + '22',
              },
            ]}
            onPress={() => setHeroIndex(i)}
          >
            <View
              style={[styles.heroAvatar, { backgroundColor: h.color + '33' }]}
            >
              <Text style={[styles.heroInitial, { color: h.color }]}>
                {h.initial}
              </Text>
            </View>
            <Text
              style={[
                styles.heroChipName,
                i === heroIndex && { color: h.color },
              ]}
              numberOfLines={1}
            >
              {h.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Stats summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Talent points</Text>
          <Text style={[styles.summaryVal, { color: C.gold }]}>
            {points} available
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Talent CP bonus</Text>
          <Text style={[styles.summaryVal, { color: C.gold }]}>
            +{talentCp}
          </Text>
        </View>
        <View style={styles.bonusRow}>
          {bonuses.atkPct > 0 && (
            <Text
              style={[
                styles.bonusBadge,
                { color: BRANCH_COLORS.atk, borderColor: BRANCH_COLORS.atk },
              ]}
            >
              ATK +{bonuses.atkPct}%
            </Text>
          )}
          {bonuses.defPct > 0 && (
            <Text
              style={[
                styles.bonusBadge,
                { color: BRANCH_COLORS.def, borderColor: BRANCH_COLORS.def },
              ]}
            >
              DEF +{bonuses.defPct}%
            </Text>
          )}
          {bonuses.hpPct > 0 && (
            <Text
              style={[
                styles.bonusBadge,
                { color: BRANCH_COLORS.hp, borderColor: BRANCH_COLORS.hp },
              ]}
            >
              HP +{bonuses.hpPct}%
            </Text>
          )}
          {bonuses.critPct > 0 && (
            <Text
              style={[
                styles.bonusBadge,
                {
                  color: BRANCH_COLORS.utility,
                  borderColor: BRANCH_COLORS.utility,
                },
              ]}
            >
              CRIT +{bonuses.critPct}%
            </Text>
          )}
          {bonuses.critDmgPct > 0 && (
            <Text
              style={[
                styles.bonusBadge,
                {
                  color: BRANCH_COLORS.utility,
                  borderColor: BRANCH_COLORS.utility,
                },
              ]}
            >
              CDMG +{bonuses.critDmgPct}%
            </Text>
          )}
          {Object.values(bonuses).every((v) => v === 0) && (
            <Text style={styles.noBonuses}>No talents unlocked yet</Text>
          )}
        </View>
      </View>

      {/* Talent tree — horizontal scroll across 4 branches */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.treeContent}
      >
        {BRANCHES.map((branch) => (
          <BranchColumn
            key={branch}
            branch={branch}
            heroId={hero.id}
            heroTalents={heroState}
            talentState={talentState}
            onNodePress={setPendingNode}
          />
        ))}
      </ScrollView>

      {/* Confirm modal */}
      {pendingNode && (
        <Modal transparent animationType="fade">
          <ConfirmModal
            node={pendingNode}
            points={points}
            onConfirm={handleConfirm}
            onClose={() => setPendingNode(null)}
          />
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const NODE_W = 130;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 54 },

  heroBar: {
    maxHeight: 64,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  heroBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  heroAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: { fontSize: 13, fontWeight: '700' },
  heroChipName: { fontSize: 12, color: C.textMuted, maxWidth: 100 },

  summaryCard: {
    margin: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: C.textMuted },
  summaryVal: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  bonusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bonusBadge: {
    fontSize: 11,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noBonuses: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },

  treeContent: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },

  branchCol: { width: NODE_W, gap: 0 },
  branchHeader: {
    borderBottomWidth: 2,
    paddingBottom: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  branchLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  nodeCard: {
    width: NODE_W,
    minHeight: 80,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 3,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 9, color: C.bg, fontWeight: '700' },
  nodeName: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textPrimary,
    marginRight: 18,
  },
  nodeDesc: { fontSize: 10, color: C.textMuted, lineHeight: 14 },
  nodeCost: { fontSize: 10, fontWeight: '500', marginTop: 2 },

  connector: {
    width: 2,
    height: 16,
    backgroundColor: C.border,
    alignSelf: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalBranch: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  modalDesc: { fontSize: 14, color: C.textMuted, lineHeight: 22 },
  modalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  modalCostLabel: { fontSize: 13, color: C.textMuted },
  modalCostVal: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 14, color: C.textMuted },
});
