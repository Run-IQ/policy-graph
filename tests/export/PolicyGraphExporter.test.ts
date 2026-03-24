import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyGraphExporter } from '../../src/export/PolicyGraphExporter.js';
import {
  makeTestGraph,
  makeGraph,
  makeMeta,
  makeNode,
  makeEdge,
  resetIdCounter,
} from '../helpers.js';
import type { PolicyGraph } from '@run-iq/policy-dsl';

describe('PolicyGraphExporter', () => {
  let graph: PolicyGraph;
  let exporter: PolicyGraphExporter;

  beforeEach(() => {
    resetIdCounter();
    graph = makeTestGraph();
    exporter = new PolicyGraphExporter(graph);
  });

  it('toVisualizationData() includes model + hasParams in Mode 2', () => {
    const data = exporter.toVisualizationData();
    // rule_4 has model: 'PROGRESSIVE_BRACKET' and params
    const rule4Vis = data.nodes.find((n) => n.id === 'rule_4');
    expect(rule4Vis).toBeDefined();
    expect(rule4Vis!.model).toBe('PROGRESSIVE_BRACKET');
    expect(rule4Vis!.hasParams).toBe(true);

    // rule_1 has no model/params
    const rule1Vis = data.nodes.find((n) => n.id === 'rule_1');
    expect(rule1Vis!.hasParams).toBe(false);
  });

  it('confidence < 0.70 → red color', () => {
    const data = exporter.toVisualizationData();
    // rule_5 has confidence 0.65
    const rule5Vis = data.nodes.find((n) => n.id === 'rule_5');
    expect(rule5Vis!.color).toBe('#e74c3c');
  });

  it('CONFLICTS_WITH edge → red color', () => {
    const data = exporter.toVisualizationData();
    const conflictEdge = data.edges.find((e) => e.type === 'CONFLICTS_WITH');
    expect(conflictEdge).toBeDefined();
    expect(conflictEdge!.color).toBe('#e74c3c');
  });

  it('crossDocument edge → crossDocument: true in output', () => {
    const crossGraph = makeGraph({
      meta: makeMeta({ id: 'cross', version: '1.0.0' }),
      nodes: [
        makeNode({ id: 'n1', sourceRef: 'doc1_s1' }),
        makeNode({ id: 'n2', sourceRef: 'doc2_s1' }),
      ],
      edges: [
        makeEdge({ id: 'ce1', from: 'n1', to: 'n2', type: 'OVERRIDES', crossDocument: true }),
      ],
      index: {
        byType: { Rule: ['n1', 'n2'], Exception: [], Definition: [], Reference: [], Threshold: [] },
        bySource: {},
        conflicts: [],
        gaps: [],
      },
    });
    const crossExporter = new PolicyGraphExporter(crossGraph);
    const data = crossExporter.toVisualizationData();
    const edge = data.edges.find((e) => e.id === 'ce1');
    expect(edge!.crossDocument).toBe(true);
  });
});
