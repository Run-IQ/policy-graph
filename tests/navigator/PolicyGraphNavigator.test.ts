import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyGraphNavigator } from '../../src/navigator/PolicyGraphNavigator.js';
import { makeTestGraph, makeGraph, makeMeta, makeNode, resetIdCounter } from '../helpers.js';
import type { PolicyGraph } from '@run-iq/policy-dsl';

describe('PolicyGraphNavigator', () => {
  let graph: PolicyGraph;
  let nav: PolicyGraphNavigator;

  beforeEach(() => {
    resetIdCounter();
    graph = makeTestGraph();
    nav = new PolicyGraphNavigator(graph);
  });

  it('getByType("Rule") returns all Rule nodes', () => {
    const rules = nav.getByType('Rule');
    expect(rules.map((n) => n.id).sort()).toEqual(['rule_1', 'rule_4', 'rule_5']);
  });

  it('getBySourceRef() returns nodes from that chunk', () => {
    const nodes = nav.getBySourceRef('chunk_1');
    expect(nodes.map((n) => n.id).sort()).toEqual(['rule_1', 'rule_2']);
  });

  it('getFlaggedNodes(0.80) returns low confidence AND flagged nodes', () => {
    const flagged = nav.getFlaggedNodes(0.8);
    const ids = flagged.map((n) => n.id).sort();
    // rule_2: confidence 0.72 + flagged, rule_5: confidence 0.65 + flagged
    expect(ids).toContain('rule_2');
    expect(ids).toContain('rule_5');
    // rule_1 (0.95), rule_3 (0.88), rule_4 (0.91) should NOT be included
    expect(ids).not.toContain('rule_1');
  });

  it('getByModel("PROGRESSIVE_BRACKET") returns Mode 2 model nodes', () => {
    const nodes = nav.getByModel('PROGRESSIVE_BRACKET');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.id).toBe('rule_4');
  });

  it('getNodesWithoutModel() returns [] in Mode 1 (standalone)', () => {
    // graph.meta.mode is 'standalone' by default
    const result = nav.getNodesWithoutModel();
    expect(result).toEqual([]);
  });

  it('getNodesWithoutModel() returns Rule nodes without model in Mode 2', () => {
    const intGraph = makeGraph({
      meta: makeMeta({ id: 'int', version: '1.0.0', mode: 'integrated' }),
      nodes: [
        makeNode({ id: 'r1', type: 'Rule', model: 'FLAT_RATE' }),
        makeNode({ id: 'r2', type: 'Rule' }), // no model
        makeNode({ id: 'r3', type: 'Definition' }), // not a Rule
      ],
      index: {
        byType: {
          Rule: ['r1', 'r2'],
          Exception: [],
          Definition: ['r3'],
          Reference: [],
          Threshold: [],
        },
        bySource: {},
        conflicts: [],
        gaps: [],
      },
    });
    const intNav = new PolicyGraphNavigator(intGraph);
    const noModel = intNav.getNodesWithoutModel();
    expect(noModel).toHaveLength(1);
    expect(noModel[0]!.id).toBe('r2');
  });

  it('getDescendants() returns all descendants transitively', () => {
    // rule_1 -> rule_2 (exception_of), rule_1 -> rule_3 (depends_on)
    // rule_3 -> rule_4 (depends_on)
    const descendants = nav.getDescendants('rule_1');
    const ids = descendants.map((n) => n.id).sort();
    expect(ids).toContain('rule_2');
    expect(ids).toContain('rule_3');
    expect(ids).toContain('rule_4');
  });

  it('getExceptions() returns exception nodes', () => {
    // rule_1 has no exceptions[] set, rule_2 has exceptions: []
    // Let's use a graph where a node has exception IDs
    const g = makeGraph({
      meta: makeMeta({ id: 'ex', version: '1.0.0' }),
      nodes: [
        makeNode({ id: 'main', exceptions: ['exc1'] }),
        makeNode({ id: 'exc1', type: 'Exception' }),
      ],
      index: {
        byType: {
          Rule: ['main'],
          Exception: ['exc1'],
          Definition: [],
          Reference: [],
          Threshold: [],
        },
        bySource: {},
        conflicts: [],
        gaps: [],
      },
    });
    const exNav = new PolicyGraphNavigator(g);
    const exceptions = exNav.getExceptions('main');
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]!.id).toBe('exc1');
  });

  it('getRequiredVariables() extracts vars from condition AST', () => {
    // rule_1 has condition GT(VAR(revenue), CONST(500000))
    const vars = nav.getRequiredVariables('rule_1');
    expect(vars).toHaveLength(1);
    expect(vars[0]!.name).toBe('revenue');
  });

  it('search() finds by label substring', () => {
    const results = nav.search('income');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('rule_1');

    const bracketResults = nav.search('bracket');
    expect(bracketResults).toHaveLength(1);
    expect(bracketResults[0]!.id).toBe('rule_4');
  });
});
