import type { PolicyGraph, PolicyNode, ConflictReport, CoverageGap } from '@run-iq/policy-dsl';
import type { ImpactReport, GraphHealthReport } from '../types.js';
import { PolicyGraphNavigator } from '../navigator/PolicyGraphNavigator.js';

export class PolicyGraphAnalyzer {
  private readonly graph: PolicyGraph;

  constructor(graph: PolicyGraph) {
    this.graph = graph;
  }

  findConflicts(): ConflictReport[] {
    const explicit = this.graph.edges
      .filter((e) => e.type === 'CONFLICTS_WITH')
      .map((e) => ({
        nodeId1: e.from,
        nodeId2: e.to,
        type: 'contradictory_conditions' as const,
        description: `Explicit conflict between "${e.from}" and "${e.to}"`,
        severity: 'warning' as const,
        ...(e.crossDocument ? { crossDocument: e.crossDocument } : {}),
      }));

    const indexed = this.graph.index.conflicts;

    const seen = new Set<string>();
    return [...explicit, ...indexed].filter((c) => {
      const key = [c.nodeId1, c.nodeId2].sort().join(':');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  findGaps(): CoverageGap[] {
    return this.graph.index.gaps;
  }

  getImpact(nodeId: string): ImpactReport {
    const navigator = new PolicyGraphNavigator(this.graph);
    const descendants = navigator.getDescendants(nodeId);
    const dependents = this.graph.edges
      .filter((e) => e.to === nodeId && e.type === 'DEPENDS_ON')
      .map((e) => navigator.getNode(e.from))
      .filter((n): n is PolicyNode => n !== undefined);

    return {
      nodeId,
      directImpact: dependents,
      transitiveImpact: descendants,
      totalImpacted: new Set([...dependents.map((n) => n.id), ...descendants.map((n) => n.id)])
        .size,
    };
  }

  healthScore(): GraphHealthReport {
    const nodes = this.graph.nodes;
    const avgConf =
      nodes.length > 0 ? nodes.reduce((s, n) => s + n.confidence, 0) / nodes.length : 0;
    const conflicts = this.findConflicts();
    const gaps = this.findGaps();
    const flagged = nodes.filter((n) => n.confidence < 0.8 || n.flagged).length;
    const navigator = new PolicyGraphNavigator(this.graph);
    const noModel = navigator.getNodesWithoutModel().length;

    const score = Math.max(
      0,
      Math.min(
        1,
        avgConf -
          conflicts.filter((c) => c.severity === 'critical').length * 0.1 -
          gaps.filter((g) => g.severity === 'critical').length * 0.05 -
          (flagged / Math.max(nodes.length, 1)) * 0.2 -
          (noModel / Math.max(nodes.length, 1)) * 0.1,
      ),
    );

    return {
      score,
      avgConfidence: avgConf,
      totalNodes: nodes.length,
      flaggedNodes: flagged,
      noModelNodes: noModel,
      conflicts: conflicts.length,
      criticalConflicts: conflicts.filter((c) => c.severity === 'critical').length,
      gaps: gaps.length,
      readyForBridge:
        score >= 0.7 &&
        conflicts.filter((c) => c.severity === 'critical').length === 0 &&
        noModel === 0,
    };
  }
}
