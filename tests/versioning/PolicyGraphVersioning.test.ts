import { describe, it, expect } from 'vitest';
import { PolicyGraphVersioning } from '../../src/versioning/PolicyGraphVersioning.js';
import { makeGraph, makeMeta, makeNode } from '../helpers.js';

describe('PolicyGraphVersioning', () => {
  const versioning = new PolicyGraphVersioning();

  it('diff() detects additions, removals, modifications', () => {
    const v1 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      nodes: [
        makeNode({ id: 'n1', label: 'Original' }),
        makeNode({ id: 'n2', label: 'To be removed' }),
      ],
    });
    const v2 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '2.0.0' }),
      nodes: [makeNode({ id: 'n1', label: 'Modified' }), makeNode({ id: 'n3', label: 'Added' })],
    });

    const diff = versioning.diff(v1, v2);
    expect(diff.summary.added).toBe(1);
    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.modified).toBe(1);
    expect(diff.added[0]!.id).toBe('n3');
    expect(diff.removed[0]!.id).toBe('n2');
    expect(diff.modified[0]!.nodeId).toBe('n1');
  });

  it('diff() detects model + params changes (Mode 2)', () => {
    const v1 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0', mode: 'integrated' }),
      nodes: [makeNode({ id: 'n1', model: 'FLAT_RATE', params: { rate: 0.1 } })],
    });
    const v2 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '2.0.0', mode: 'integrated' }),
      nodes: [makeNode({ id: 'n1', model: 'PROGRESSIVE_BRACKET', params: { brackets: [] } })],
    });

    const diff = versioning.diff(v1, v2);
    expect(diff.modified).toHaveLength(1);
    const changes = diff.modified[0]!.changes;
    expect(changes.find((c) => c.field === 'model')).toBeDefined();
    expect(changes.find((c) => c.field === 'params')).toBeDefined();
  });

  it('summarizeDiff() returns human description', () => {
    const v1 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      nodes: [makeNode({ id: 'n1', label: 'A' })],
    });
    const v2 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '2.0.0' }),
      nodes: [makeNode({ id: 'n1', label: 'B' }), makeNode({ id: 'n2', label: 'C' })],
    });

    const diff = versioning.diff(v1, v2);
    const summary = versioning.summarizeDiff(diff);
    expect(summary).toContain('added');
    expect(summary).toContain('modified');
  });

  it("No changes → 'No changes detected'", () => {
    const v1 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      nodes: [makeNode({ id: 'n1', label: 'Same' })],
    });
    const v2 = makeGraph({
      meta: makeMeta({ id: 'g1', version: '2.0.0' }),
      nodes: [makeNode({ id: 'n1', label: 'Same' })],
    });

    const diff = versioning.diff(v1, v2);
    expect(versioning.summarizeDiff(diff)).toBe('No changes detected');
  });
});
