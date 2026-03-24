import type { PolicyGraph, PolicyNode, PolicyEdge } from '@run-iq/policy-dsl';
import type { VisualizationNode, VisualizationEdge, VisualizationData } from '../types.js';

export class PolicyGraphExporter {
  private readonly graph: PolicyGraph;

  constructor(graph: PolicyGraph) {
    this.graph = graph;
  }

  toJSON(): string {
    return JSON.stringify(this.graph, null, 2);
  }

  toVisualizationData(): VisualizationData {
    const nodes: VisualizationNode[] = this.graph.nodes.map((n) => this.toVisNode(n));
    const edges: VisualizationEdge[] = this.graph.edges.map((e) => this.toVisEdge(e));

    return {
      nodes,
      edges,
      meta: this.graph.meta,
      conflicts: this.graph.index.conflicts,
      gaps: this.graph.index.gaps,
    };
  }

  private toVisNode(node: PolicyNode): VisualizationNode {
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      confidence: node.confidence,
      sourceRef: node.sourceRef,
      flagged: node.flagged === true,
      ...(node.model !== undefined ? { model: node.model } : {}),
      hasParams: node.params !== undefined && node.params !== null,
      color: nodeColor(node.confidence, node.type),
      ...(node.overrides ? { overrides: node.overrides } : {}),
      ...(node.modifies ? { modifies: node.modifies } : {}),
    };
  }

  private toVisEdge(edge: PolicyEdge): VisualizationEdge {
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      type: edge.type,
      ...(edge.crossDocument ? { crossDocument: edge.crossDocument } : {}),
      color: edgeColor(edge.type),
    };
  }
}

export function nodeColor(confidence: number, type: string): string {
  if (confidence < 0.7) return '#e74c3c'; // red
  if (confidence < 0.8) return '#f39c12'; // orange
  switch (type) {
    case 'Exception':
      return '#9b59b6'; // purple
    case 'Definition':
      return '#3498db'; // blue
    case 'Reference':
      return '#95a5a6'; // grey
    case 'Threshold':
      return '#e67e22'; // dark orange
    default:
      return '#2ecc71'; // green (Rule + unknown)
  }
}

export function edgeColor(type: string): string {
  switch (type) {
    case 'CONFLICTS_WITH':
      return '#e74c3c'; // red
    case 'OVERRIDES':
      return '#f39c12'; // orange
    case 'EXCEPTION_OF':
      return '#9b59b6'; // purple
    case 'MODIFIES':
      return '#e67e22'; // dark orange
    default:
      return '#7f8c8d'; // grey
  }
}
