import type { PolicyGraph, PolicyNode } from '@run-iq/policy-dsl';

// ── Store ─────────────────────────────────────────────────────────────────────

export interface GraphListFilters {
  domain?: string;
  language?: string;
  mode?: 'standalone' | 'integrated';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

export interface ImpactReport {
  nodeId: string;
  directImpact: PolicyNode[];
  transitiveImpact: PolicyNode[];
  totalImpacted: number;
}

export interface GraphHealthReport {
  score: number;
  avgConfidence: number;
  totalNodes: number;
  flaggedNodes: number;
  noModelNodes: number;
  conflicts: number;
  criticalConflicts: number;
  gaps: number;
  readyForBridge: boolean;
}

// ── Versioning ────────────────────────────────────────────────────────────────

export interface PolicyGraphDiff {
  graphId: string;
  fromVersion: string;
  toVersion: string;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  added: PolicyNode[];
  removed: PolicyNode[];
  modified: NodeDiff[];
  unchanged: PolicyNode[];
}

export interface NodeDiff {
  nodeId: string;
  before: PolicyNode;
  after: PolicyNode;
  changes: NodeChange[];
}

export interface NodeChange {
  field: string;
  before: unknown;
  after: unknown;
}

// ── QA ────────────────────────────────────────────────────────────────────────

export interface QALanguageModel {
  generate(p: {
    question: string;
    context: string;
    instruction: string;
  }): Promise<{ text: string; confidence?: number }>;
  embed?(text: string): Promise<number[]>;
}

export interface QAOptions {
  maxChunks?: number;
}

export interface QAResult {
  question: string;
  answer: string;
  sources: Array<{ sourceRef: string; text: string }>;
  confidence: number;
}

// ── Exporter ──────────────────────────────────────────────────────────────────

export interface VisualizationNode {
  id: string;
  label: string;
  type: string;
  confidence: number;
  sourceRef: string;
  flagged: boolean;
  model?: string;
  hasParams: boolean;
  color: string;
  overrides?: string[];
  modifies?: string[];
}

export interface VisualizationEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  crossDocument?: boolean;
  color: string;
}

export interface VisualizationData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  meta: PolicyGraph['meta'];
  conflicts: PolicyGraph['index']['conflicts'];
  gaps: PolicyGraph['index']['gaps'];
}
