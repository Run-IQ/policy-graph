import type {
  PolicyGraph,
  PolicyGraphMeta,
  PolicyNode,
  PolicyEdge,
  PolicyVariable,
  DocumentChunk,
  PolicyExpression,
  PolicyAction,
  ConflictReport,
  CoverageGap,
  PolicyNodeType,
  PolicyEdgeType,
} from '@run-iq/policy-dsl';

// ── Defaults ──────────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(prefix = 'id'): string {
  return `${prefix}_${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ── Node factory ──────────────────────────────────────────────────────────────

export function makeNode(overrides: Partial<PolicyNode> & { id: string }): PolicyNode {
  return {
    type: 'Rule' as PolicyNodeType,
    label: `Node ${overrides.id}`,
    sourceRef: 'chunk_1',
    confidence: 0.9,
    extractedBy: 'llm-v1',
    ...overrides,
  };
}

// ── Edge factory ──────────────────────────────────────────────────────────────

export function makeEdge(
  overrides: Partial<PolicyEdge> & { from: string; to: string },
): PolicyEdge {
  return {
    id: overrides.id ?? nextId('edge'),
    type: 'DEPENDS_ON' as PolicyEdgeType,
    ...overrides,
  };
}

// ── Variable factory ──────────────────────────────────────────────────────────

export function makeVariable(
  overrides: Partial<PolicyVariable> & { name: string },
): PolicyVariable {
  return {
    type: 'number',
    description: `Variable ${overrides.name}`,
    sourceRef: 'chunk_1',
    required: true,
    ...overrides,
  };
}

// ── Chunk factory ─────────────────────────────────────────────────────────────

export function makeChunk(overrides: Partial<DocumentChunk> & { id: string }): DocumentChunk {
  return {
    text: `Original text for ${overrides.id}`,
    cleanedText: `cleaned text for ${overrides.id}`,
    ...overrides,
  };
}

// ── Meta factory ──────────────────────────────────────────────────────────────

export function makeMeta(overrides?: Partial<PolicyGraphMeta>): PolicyGraphMeta {
  return {
    id: overrides?.id ?? nextId('graph'),
    version: overrides?.version ?? '1.0.0',
    dslVersion: '1.0.0',
    title: 'Test Graph',
    domain: 'fiscal',
    language: 'fr',
    mode: 'standalone',
    source: {
      filename: 'test.pdf',
      type: 'pdf',
      hash: 'abc123',
      ingestedAt: '2026-01-01T00:00:00Z',
    },
    confidence: 0.9,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Conflict factory ──────────────────────────────────────────────────────────

export function makeConflict(overrides?: Partial<ConflictReport>): ConflictReport {
  return {
    nodeId1: 'n1',
    nodeId2: 'n2',
    type: 'contradictory_conditions',
    description: 'Test conflict',
    severity: 'warning',
    ...overrides,
  };
}

// ── Gap factory ───────────────────────────────────────────────────────────────

export function makeGap(overrides?: Partial<CoverageGap>): CoverageGap {
  return {
    description: 'Test gap',
    affectedNodes: ['n1'],
    severity: 'warning',
    ...overrides,
  };
}

// ── Expression factories ──────────────────────────────────────────────────────

export function makeGtExpression(varPath: string, value: number): PolicyExpression {
  return {
    type: 'GT',
    left: { type: 'VAR', path: varPath },
    right: { type: 'CONST', value },
  };
}

export function makeAndExpression(
  left: PolicyExpression,
  right: PolicyExpression,
): PolicyExpression {
  return { type: 'AND', left, right };
}

export function makeExistsExpression(variable: string): PolicyExpression {
  return { type: 'EXISTS', variable };
}

// ── Action factory ────────────────────────────────────────────────────────────

export function makeSetAction(output: string, value: number): PolicyAction {
  return { type: 'SET', output, value: { type: 'CONST', value } };
}

// ── Full graph factory ────────────────────────────────────────────────────────

export function makeGraph(overrides?: Partial<PolicyGraph>): PolicyGraph {
  const defaultMeta = makeMeta(overrides?.meta);
  return {
    meta: defaultMeta,
    nodes: overrides?.nodes ?? [],
    edges: overrides?.edges ?? [],
    variables: overrides?.variables ?? [],
    chunks: overrides?.chunks ?? [],
    index: overrides?.index ?? {
      byType: { Rule: [], Exception: [], Definition: [], Reference: [], Threshold: [] },
      bySource: {},
      conflicts: [],
      gaps: [],
    },
  };
}

// ── Pre-built test graph ──────────────────────────────────────────────────────

export function makeTestGraph(): PolicyGraph {
  const n1 = makeNode({
    id: 'rule_1',
    label: 'Income Tax Rate',
    type: 'Rule',
    sourceRef: 'chunk_1',
    confidence: 0.95,
    condition: makeGtExpression('revenue', 500000),
    action: makeSetAction('tax', 15000),
  });

  const n2 = makeNode({
    id: 'rule_2',
    label: 'Small Business Exemption',
    type: 'Exception',
    sourceRef: 'chunk_1',
    confidence: 0.72,
    flagged: true,
    flagReason: 'LOW_CONFIDENCE',
    exceptions: [],
    condition: makeGtExpression('employees', 10),
    action: makeSetAction('exemption', 5000),
  });

  const n3 = makeNode({
    id: 'rule_3',
    label: 'Definition of Revenue',
    type: 'Definition',
    sourceRef: 'chunk_2',
    confidence: 0.88,
  });

  const n4 = makeNode({
    id: 'rule_4',
    label: 'Progressive Bracket Rule',
    type: 'Rule',
    sourceRef: 'chunk_2',
    confidence: 0.91,
    model: 'PROGRESSIVE_BRACKET',
    params: { brackets: [{ min: 0, max: 500000, rate: 0 }] },
    condition: makeGtExpression('revenue', 0),
    action: makeSetAction('tax_bracket', 0),
  });

  const n5 = makeNode({
    id: 'rule_5',
    label: 'Flat Rate Model',
    type: 'Rule',
    sourceRef: 'chunk_3',
    confidence: 0.65,
    flagged: true,
    flagReason: 'LOW_CONFIDENCE',
  });

  const e1 = makeEdge({ id: 'e1', from: 'rule_1', to: 'rule_2', type: 'EXCEPTION_OF' });
  const e2 = makeEdge({ id: 'e2', from: 'rule_1', to: 'rule_3', type: 'DEPENDS_ON' });
  const e3 = makeEdge({ id: 'e3', from: 'rule_3', to: 'rule_4', type: 'DEPENDS_ON' });
  const eConflict = makeEdge({
    id: 'e_conflict',
    from: 'rule_1',
    to: 'rule_4',
    type: 'CONFLICTS_WITH',
  });

  const v1 = makeVariable({ name: 'revenue', type: 'number', sourceRef: 'chunk_1' });
  const v2 = makeVariable({ name: 'employees', type: 'number', sourceRef: 'chunk_1' });

  const c1 = makeChunk({
    id: 'chunk_1',
    text: 'Income tax rules',
    cleanedText: 'income tax rules',
  });
  const c2 = makeChunk({
    id: 'chunk_2',
    text: 'Revenue definition and brackets',
    cleanedText: 'revenue definition and brackets',
  });
  const c3 = makeChunk({
    id: 'chunk_3',
    text: 'Flat rate provisions',
    cleanedText: 'flat rate provisions',
  });

  return makeGraph({
    meta: makeMeta({ id: 'test-graph', version: '1.0.0' }),
    nodes: [n1, n2, n3, n4, n5],
    edges: [e1, e2, e3, eConflict],
    variables: [v1, v2],
    chunks: [c1, c2, c3],
    index: {
      byType: {
        Rule: ['rule_1', 'rule_4', 'rule_5'],
        Exception: ['rule_2'],
        Definition: ['rule_3'],
        Reference: [],
        Threshold: [],
      },
      bySource: {
        chunk_1: ['rule_1', 'rule_2'],
        chunk_2: ['rule_3', 'rule_4'],
        chunk_3: ['rule_5'],
      },
      conflicts: [
        makeConflict({
          nodeId1: 'rule_1',
          nodeId2: 'rule_4',
          severity: 'warning',
          description: 'Indexed conflict between rule_1 and rule_4',
        }),
      ],
      gaps: [makeGap({ description: 'No rule covers zero-revenue case', severity: 'warning' })],
    },
  });
}
