import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyGraphAnalyzer } from '../../src/analyzer/PolicyGraphAnalyzer.js';
import {
  makeTestGraph,
  makeGraph,
  makeMeta,
  makeNode,
  makeConflict,
  makeGap,
  resetIdCounter,
} from '../helpers.js';
import type { PolicyGraph } from '@run-iq/policy-dsl';

describe('PolicyGraphAnalyzer', () => {
  let graph: PolicyGraph;
  let analyzer: PolicyGraphAnalyzer;

  beforeEach(() => {
    resetIdCounter();
    graph = makeTestGraph();
    analyzer = new PolicyGraphAnalyzer(graph);
  });

  it('findConflicts() returns CONFLICTS_WITH edges deduplicated', () => {
    // The test graph has both an edge-based conflict (e_conflict: rule_1->rule_4)
    // and an indexed conflict (rule_1, rule_4). They should be deduplicated.
    const conflicts = analyzer.findConflicts();
    const pairs = conflicts.map((c) => [c.nodeId1, c.nodeId2].sort().join(':'));
    const unique = new Set(pairs);
    expect(unique.size).toBe(pairs.length); // no duplicates
    expect(unique.has('rule_1:rule_4')).toBe(true);
  });

  it('healthScore().readyForBridge = false if noModelNodes > 0 (Mode 2)', () => {
    const intGraph = makeGraph({
      meta: makeMeta({ id: 'int', version: '1.0.0', mode: 'integrated' }),
      nodes: [
        makeNode({ id: 'r1', type: 'Rule', confidence: 0.95 }), // no model
      ],
      index: {
        byType: { Rule: ['r1'], Exception: [], Definition: [], Reference: [], Threshold: [] },
        bySource: {},
        conflicts: [],
        gaps: [],
      },
    });
    const intAnalyzer = new PolicyGraphAnalyzer(intGraph);
    const health = intAnalyzer.healthScore();
    expect(health.noModelNodes).toBeGreaterThan(0);
    expect(health.readyForBridge).toBe(false);
  });

  it('healthScore().readyForBridge = true if score >= 0.70 and 0 critical conflicts (Mode 1)', () => {
    const cleanGraph = makeGraph({
      meta: makeMeta({ id: 'clean', version: '1.0.0', mode: 'standalone' }),
      nodes: [makeNode({ id: 'r1', confidence: 0.95 }), makeNode({ id: 'r2', confidence: 0.9 })],
      index: {
        byType: { Rule: ['r1', 'r2'], Exception: [], Definition: [], Reference: [], Threshold: [] },
        bySource: {},
        conflicts: [],
        gaps: [],
      },
    });
    const cleanAnalyzer = new PolicyGraphAnalyzer(cleanGraph);
    const health = cleanAnalyzer.healthScore();
    expect(health.score).toBeGreaterThanOrEqual(0.7);
    expect(health.criticalConflicts).toBe(0);
    expect(health.readyForBridge).toBe(true);
  });

  it('getImpact() returns direct + transitive impacted nodes', () => {
    const impact = analyzer.getImpact('rule_3');
    // rule_3 has a DEPENDS_ON edge from rule_1 (rule_1 -> rule_3),
    // so rule_1 is a direct dependent
    // rule_3 -> rule_4 (depends_on), so rule_4 is a descendant
    expect(impact.nodeId).toBe('rule_3');
    expect(impact.transitiveImpact.map((n) => n.id)).toContain('rule_4');
    expect(impact.totalImpacted).toBeGreaterThan(0);
  });

  it('healthScore penalizes low confidence, critical conflicts, gaps', () => {
    const badGraph = makeGraph({
      meta: makeMeta({ id: 'bad', version: '1.0.0' }),
      nodes: [
        makeNode({ id: 'r1', confidence: 0.4, flagged: true }),
        makeNode({ id: 'r2', confidence: 0.3, flagged: true }),
      ],
      index: {
        byType: { Rule: ['r1', 'r2'], Exception: [], Definition: [], Reference: [], Threshold: [] },
        bySource: {},
        conflicts: [makeConflict({ severity: 'critical' })],
        gaps: [makeGap({ severity: 'critical' })],
      },
    });
    const badAnalyzer = new PolicyGraphAnalyzer(badGraph);
    const health = badAnalyzer.healthScore();
    expect(health.score).toBeLessThan(0.5);
    expect(health.criticalConflicts).toBe(1);
    expect(health.gaps).toBe(1);
  });
});
