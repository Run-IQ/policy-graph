import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPolicyGraphStore } from '../../src/store/InMemoryPolicyGraphStore.js';
import { PolicyGraphVersionConflictError } from '../../src/errors.js';
import { makeGraph, makeMeta, makeChunk, resetIdCounter } from '../helpers.js';

describe('InMemoryPolicyGraphStore', () => {
  let store: InMemoryPolicyGraphStore;

  beforeEach(() => {
    store = new InMemoryPolicyGraphStore();
    resetIdCounter();
  });

  it('save() creates a new version', async () => {
    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
    });
    await store.save(graph);

    const result = await store.get('g1');
    expect(result).not.toBeNull();
    expect(result!.meta.version).toBe('1.0.0');
  });

  it('save() throws VersionConflictError if version exists', async () => {
    const graph = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    await store.save(graph);

    const duplicate = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    await expect(store.save(duplicate)).rejects.toThrow(PolicyGraphVersionConflictError);
  });

  it('get() without version returns latest', async () => {
    const v1 = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    const v2 = makeGraph({ meta: makeMeta({ id: 'g1', version: '2.0.0' }) });
    await store.save(v1);
    await store.save(v2);

    const result = await store.get('g1');
    expect(result!.meta.version).toBe('2.0.0');
  });

  it('get() with version returns that version', async () => {
    const v1 = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    const v2 = makeGraph({ meta: makeMeta({ id: 'g1', version: '2.0.0' }) });
    await store.save(v1);
    await store.save(v2);

    const result = await store.get('g1', '1.0.0');
    expect(result!.meta.version).toBe('1.0.0');
  });

  it('getChunk() returns chunk via O(1) index', async () => {
    const chunk = makeChunk({ id: 'sec1_segment_1' });
    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      chunks: [chunk],
    });
    await store.save(graph);

    const result = await store.getChunk('g1', 'sec1_segment_1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('sec1_segment_1');
  });

  it('getChunk() returns null for unknown sourceRef', async () => {
    const graph = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    await store.save(graph);

    const result = await store.getChunk('g1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('list() filters by domain, language, mode', async () => {
    const g1 = makeGraph({
      meta: makeMeta({
        id: 'g1',
        version: '1.0.0',
        domain: 'fiscal',
        language: 'fr',
        mode: 'standalone',
      }),
    });
    const g2 = makeGraph({
      meta: makeMeta({
        id: 'g2',
        version: '1.0.0',
        domain: 'payroll',
        language: 'en',
        mode: 'integrated',
      }),
    });
    await store.save(g1);
    await store.save(g2);

    const fiscalOnly = await store.list({ domain: 'fiscal' });
    expect(fiscalOnly).toHaveLength(1);
    expect(fiscalOnly[0]!.id).toBe('g1');

    const enOnly = await store.list({ language: 'en' });
    expect(enOnly).toHaveLength(1);
    expect(enOnly[0]!.id).toBe('g2');

    const integratedOnly = await store.list({ mode: 'integrated' });
    expect(integratedOnly).toHaveLength(1);
    expect(integratedOnly[0]!.id).toBe('g2');
  });

  it('getHistory() returns all versions in order', async () => {
    const v1 = makeGraph({ meta: makeMeta({ id: 'g1', version: '1.0.0' }) });
    const v2 = makeGraph({ meta: makeMeta({ id: 'g1', version: '2.0.0' }) });
    const v3 = makeGraph({ meta: makeMeta({ id: 'g1', version: '3.0.0' }) });
    await store.save(v1);
    await store.save(v2);
    await store.save(v3);

    const history = await store.getHistory('g1');
    expect(history).toHaveLength(3);
    expect(history.map((m) => m.version)).toEqual(['1.0.0', '2.0.0', '3.0.0']);
  });
});
