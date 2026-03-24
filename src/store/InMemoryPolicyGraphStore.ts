import type { PolicyGraph, PolicyGraphMeta, DocumentChunk } from '@run-iq/policy-dsl';
import type { PolicyGraphStore } from './PolicyGraphStore.js';
import type { GraphListFilters } from '../types.js';
import { PolicyGraphVersionConflictError } from '../errors.js';

export class InMemoryPolicyGraphStore implements PolicyGraphStore {
  private readonly graphs: Map<string, PolicyGraph[]> = new Map();
  private readonly chunkIndex: Map<string, DocumentChunk> = new Map();

  async save(graph: PolicyGraph): Promise<void> {
    const versions = this.graphs.get(graph.meta.id) ?? [];
    if (versions.find((g) => g.meta.version === graph.meta.version)) {
      throw new PolicyGraphVersionConflictError(
        `Graph "${graph.meta.id}" version "${graph.meta.version}" already exists`,
      );
    }
    versions.push(graph);
    this.graphs.set(graph.meta.id, versions);

    for (const chunk of graph.chunks) {
      this.chunkIndex.set(`${graph.meta.id}:${chunk.id}`, chunk);
    }
  }

  async get(graphId: string, version?: string): Promise<PolicyGraph | null> {
    const versions = this.graphs.get(graphId);
    if (!versions?.length) return null;
    if (version) return versions.find((g) => g.meta.version === version) ?? null;
    return versions[versions.length - 1] ?? null;
  }

  async getChunk(graphId: string, sourceRef: string): Promise<DocumentChunk | null> {
    return this.chunkIndex.get(`${graphId}:${sourceRef}`) ?? null;
  }

  async list(filters?: GraphListFilters): Promise<PolicyGraphMeta[]> {
    let results = [...this.graphs.values()]
      .map((versions) => {
        const last = versions[versions.length - 1];
        return last?.meta;
      })
      .filter((meta): meta is PolicyGraphMeta => meta !== undefined)
      .filter((meta) => {
        if (filters?.domain && meta.domain !== filters.domain) return false;
        if (filters?.language && meta.language !== filters.language) return false;
        if (filters?.mode && meta.mode !== filters.mode) return false;
        if (filters?.from && meta.createdAt < filters.from) return false;
        if (filters?.to && meta.createdAt > filters.to) return false;
        return true;
      });

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  async getHistory(graphId: string): Promise<PolicyGraphMeta[]> {
    return (this.graphs.get(graphId) ?? []).map((g) => g.meta);
  }

  async delete(graphId: string, version?: string): Promise<void> {
    const versions = this.graphs.get(graphId);
    if (!versions) return;

    if (version) {
      const graph = versions.find((g) => g.meta.version === version);
      if (graph) {
        (graph.meta as PolicyGraphMeta & { deletedAt?: string }).deletedAt =
          new Date().toISOString();
      }
    } else {
      for (const g of versions) {
        (g.meta as PolicyGraphMeta & { deletedAt?: string }).deletedAt = new Date().toISOString();
      }
    }
  }
}
