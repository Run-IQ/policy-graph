// ── Store ─────────────────────────────────────────────────────────────────────
export type { PolicyGraphStore } from './store/PolicyGraphStore.js';
export { InMemoryPolicyGraphStore } from './store/InMemoryPolicyGraphStore.js';

// ── Navigator ─────────────────────────────────────────────────────────────────
export { PolicyGraphNavigator } from './navigator/PolicyGraphNavigator.js';

// ── Analyzer ──────────────────────────────────────────────────────────────────
export { PolicyGraphAnalyzer } from './analyzer/PolicyGraphAnalyzer.js';

// ── Versioning ────────────────────────────────────────────────────────────────
export { PolicyGraphVersioning } from './versioning/PolicyGraphVersioning.js';

// ── QA ────────────────────────────────────────────────────────────────────────
export { PolicyGraphQA } from './qa/PolicyGraphQA.js';

// ── Export ────────────────────────────────────────────────────────────────────
export { PolicyGraphExporter, nodeColor, edgeColor } from './export/PolicyGraphExporter.js';

// ── Merger (v2 stub) ──────────────────────────────────────────────────────────
export { PolicyGraphMerger } from './merger/PolicyGraphMerger.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  PolicyGraphError,
  PolicyGraphNotFoundError,
  PolicyGraphVersionConflictError,
  PolicyGraphNodeNotFoundError,
} from './errors.js';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  GraphListFilters,
  ImpactReport,
  GraphHealthReport,
  PolicyGraphDiff,
  NodeDiff,
  NodeChange,
  QALanguageModel,
  QAOptions,
  QAResult,
  VisualizationNode,
  VisualizationEdge,
  VisualizationData,
} from './types.js';

// ── Re-exported policy-dsl types ──────────────────────────────────────────────
export type {
  PolicyGraph,
  PolicyGraphMeta,
  PolicyNode,
  PolicyNodeType,
  PolicyEdge,
  PolicyEdgeType,
  PolicyVariable,
  PolicyExpression,
  PolicyValue,
  PolicyAction,
  DocumentChunk,
  ConflictReport,
  CoverageGap,
  FlagReason,
} from '@run-iq/policy-dsl';
