import type { PolicyGraph, PolicyGraphMeta, DocumentChunk } from '@run-iq/policy-dsl';
import type { GraphListFilters } from '../types.js';

export interface PolicyGraphStore {
  save(graph: PolicyGraph): Promise<void>;
  get(graphId: string, version?: string): Promise<PolicyGraph | null>;
  getChunk(graphId: string, sourceRef: string): Promise<DocumentChunk | null>;
  list(filters?: GraphListFilters): Promise<PolicyGraphMeta[]>;
  getHistory(graphId: string): Promise<PolicyGraphMeta[]>;
  delete(graphId: string, version?: string): Promise<void>;
}
