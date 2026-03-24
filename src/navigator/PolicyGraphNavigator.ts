import type {
  PolicyGraph,
  PolicyNode,
  PolicyEdge,
  PolicyEdgeType,
  PolicyNodeType,
  PolicyVariable,
  PolicyExpression,
  PolicyValue,
} from '@run-iq/policy-dsl';
import { PolicyGraphNodeNotFoundError } from '../errors.js';

export class PolicyGraphNavigator {
  private readonly graph: PolicyGraph;

  constructor(graph: PolicyGraph) {
    this.graph = graph;
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────

  getNode(nodeId: string): PolicyNode | undefined {
    return this.graph.nodes.find((n) => n.id === nodeId);
  }

  getNodeOrThrow(nodeId: string): PolicyNode {
    const node = this.getNode(nodeId);
    if (!node) throw new PolicyGraphNodeNotFoundError(`Node "${nodeId}" not found`);
    return node;
  }

  getByType(type: PolicyNodeType): PolicyNode[] {
    return (this.graph.index.byType[type] ?? [])
      .map((id) => this.getNode(id))
      .filter((n): n is PolicyNode => n !== undefined);
  }

  getBySourceRef(sourceRef: string): PolicyNode[] {
    return (this.graph.index.bySource[sourceRef] ?? [])
      .map((id) => this.getNode(id))
      .filter((n): n is PolicyNode => n !== undefined);
  }

  getRuleNodes(): PolicyNode[] {
    return this.getByType('Rule');
  }

  getFlaggedNodes(threshold = 0.8): PolicyNode[] {
    return this.graph.nodes.filter((n) => n.confidence < threshold || n.flagged === true);
  }

  getConfidentNodes(threshold = 0.8): PolicyNode[] {
    return this.graph.nodes.filter((n) => n.confidence >= threshold && !n.flagged);
  }

  // ── Mode 2 — model filters ───────────────────────────────────────────────

  getByModel(modelName: string): PolicyNode[] {
    return this.graph.nodes.filter((n) => n.model === modelName);
  }

  getNodesWithoutModel(): PolicyNode[] {
    if (this.graph.meta.mode === 'standalone') return [];
    return this.graph.nodes.filter((n) => n.type === 'Rule' && (!n.model || n.model === 'UNKNOWN'));
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  getEdgesFrom(nodeId: string): PolicyEdge[] {
    return this.graph.edges.filter((e) => e.from === nodeId);
  }

  getEdgesTo(nodeId: string): PolicyEdge[] {
    return this.graph.edges.filter((e) => e.to === nodeId);
  }

  getEdgesByType(type: PolicyEdgeType): PolicyEdge[] {
    return this.graph.edges.filter((e) => e.type === type);
  }

  getParents(nodeId: string): PolicyNode[] {
    return this.getEdgesTo(nodeId)
      .map((e) => this.getNode(e.from))
      .filter((n): n is PolicyNode => n !== undefined);
  }

  getChildren(nodeId: string): PolicyNode[] {
    return this.getEdgesFrom(nodeId)
      .map((e) => this.getNode(e.to))
      .filter((n): n is PolicyNode => n !== undefined);
  }

  getDescendants(nodeId: string, visited = new Set<string>()): PolicyNode[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const children = this.getChildren(nodeId);
    return [...children, ...children.flatMap((c) => this.getDescendants(c.id, visited))];
  }

  getExceptions(nodeId: string): PolicyNode[] {
    const node = this.getNode(nodeId);
    return (node?.exceptions ?? [])
      .map((id) => this.getNode(id))
      .filter((n): n is PolicyNode => n !== undefined);
  }

  // ── Variables ─────────────────────────────────────────────────────────────

  getVariable(name: string): PolicyVariable | undefined {
    return this.graph.variables.find((v) => v.name === name);
  }

  getRequiredVariables(nodeId: string): PolicyVariable[] {
    const node = this.getNodeOrThrow(nodeId);
    if (!node.condition) return [];
    const paths = this.extractVarPaths(node.condition);
    return paths
      .map((p) => this.getVariable(p))
      .filter((v): v is PolicyVariable => v !== undefined);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  search(query: string): PolicyNode[] {
    const lower = query.toLowerCase();
    return this.graph.nodes.filter((n) => n.label.toLowerCase().includes(lower));
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private extractVarPaths(expr: PolicyExpression): string[] {
    switch (expr.type) {
      case 'AND':
      case 'OR':
        return [...this.extractVarPaths(expr.left), ...this.extractVarPaths(expr.right)];
      case 'NOT':
        return this.extractVarPaths(expr.expr);
      case 'GT':
      case 'GTE':
      case 'LT':
      case 'LTE':
      case 'EQ':
      case 'NEQ':
        return [...this.extractValuePaths(expr.left), ...this.extractValuePaths(expr.right)];
      case 'BETWEEN':
        return [
          ...this.extractValuePaths(expr.value),
          ...this.extractValuePaths(expr.min),
          ...this.extractValuePaths(expr.max),
        ];
      case 'IN':
      case 'NOT_IN':
        return [
          ...this.extractValuePaths(expr.value),
          ...expr.set.flatMap((v) => this.extractValuePaths(v)),
        ];
      case 'BEFORE':
      case 'AFTER':
        return [...this.extractValuePaths(expr.value), ...this.extractValuePaths(expr.date)];
      case 'EXISTS':
      case 'MISSING':
        return [expr.variable];
      case 'RULE_REF':
        return [];
      default:
        return [];
    }
  }

  private extractValuePaths(value: PolicyValue): string[] {
    return value.type === 'VAR' ? [value.path] : [];
  }
}
