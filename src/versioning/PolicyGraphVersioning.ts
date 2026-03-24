import type { PolicyGraph, PolicyNode } from '@run-iq/policy-dsl';
import type { PolicyGraphDiff, NodeDiff, NodeChange } from '../types.js';

export class PolicyGraphVersioning {
  diff(v1: PolicyGraph, v2: PolicyGraph): PolicyGraphDiff {
    const v1Map = new Map(v1.nodes.map((n) => [n.id, n]));
    const v2Map = new Map(v2.nodes.map((n) => [n.id, n]));

    const added: PolicyNode[] = [];
    const removed: PolicyNode[] = [];
    const modified: NodeDiff[] = [];
    const unchanged: PolicyNode[] = [];

    for (const [id, node] of v2Map) {
      const old = v1Map.get(id);
      if (!old) {
        added.push(node);
      } else if (JSON.stringify(old) !== JSON.stringify(node)) {
        modified.push({ nodeId: id, before: old, after: node, changes: this.diffNode(old, node) });
      } else {
        unchanged.push(node);
      }
    }

    for (const [id, node] of v1Map) {
      if (!v2Map.has(id)) removed.push(node);
    }

    return {
      graphId: v1.meta.id,
      fromVersion: v1.meta.version,
      toVersion: v2.meta.version,
      summary: {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        unchanged: unchanged.length,
      },
      added,
      removed,
      modified,
      unchanged,
    };
  }

  summarizeDiff(diff: PolicyGraphDiff): string {
    const parts: string[] = [];
    if (diff.added.length) parts.push(`${diff.added.length} rule(s) added`);
    if (diff.removed.length) parts.push(`${diff.removed.length} rule(s) removed`);
    if (diff.modified.length) parts.push(`${diff.modified.length} rule(s) modified`);
    return parts.join(', ') || 'No changes detected';
  }

  private diffNode(before: PolicyNode, after: PolicyNode): NodeChange[] {
    const changes: NodeChange[] = [];
    if (before.label !== after.label)
      changes.push({ field: 'label', before: before.label, after: after.label });
    if (JSON.stringify(before.condition) !== JSON.stringify(after.condition))
      changes.push({ field: 'condition', before: before.condition, after: after.condition });
    if (JSON.stringify(before.action) !== JSON.stringify(after.action))
      changes.push({ field: 'action', before: before.action, after: after.action });
    if (before.model !== after.model)
      changes.push({ field: 'model', before: before.model, after: after.model });
    if (JSON.stringify(before.params) !== JSON.stringify(after.params))
      changes.push({ field: 'params', before: before.params, after: after.params });
    return changes;
  }
}
