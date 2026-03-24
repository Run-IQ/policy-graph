import type { PolicyGraph, DocumentChunk } from '@run-iq/policy-dsl';
import type { QALanguageModel, QAOptions, QAResult } from '../types.js';

export class PolicyGraphQA {
  private readonly graph: PolicyGraph;
  private readonly llm: QALanguageModel | undefined;

  constructor(graph: PolicyGraph, llm?: QALanguageModel) {
    this.graph = graph;
    this.llm = llm;
  }

  async query(question: string, options?: QAOptions): Promise<QAResult> {
    const maxChunks = options?.maxChunks ?? 5;
    const relevantChunks = await this.findRelevantChunks(question, maxChunks);

    if (!relevantChunks.length) {
      return { question, answer: 'No relevant information found.', sources: [], confidence: 0 };
    }

    if (!this.llm) {
      return {
        question,
        answer: relevantChunks.map((c) => c.text).join('\n\n'),
        sources: relevantChunks.map((c) => ({ sourceRef: c.id, text: c.text })),
        confidence: 0.5,
      };
    }

    const answer = await this.llm.generate({
      question,
      context: relevantChunks.map((c) => `[${c.id}] ${c.text}`).join('\n\n'),
      instruction: 'Answer based only on the provided context. Cite sources using [sourceRef].',
    });

    return {
      question,
      answer: answer.text,
      sources: relevantChunks.map((c) => ({ sourceRef: c.id, text: c.text })),
      confidence: answer.confidence ?? 0.8,
    };
  }

  private async findRelevantChunks(question: string, max: number): Promise<DocumentChunk[]> {
    const withEmb = this.graph.chunks.filter((c) => c.embedding);
    if (withEmb.length > 0 && this.llm?.embed) {
      const qEmb = await this.llm.embed(question);
      return withEmb
        .map((c) => ({ chunk: c, score: cosineSimilarity(qEmb, c.embedding!) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, max)
        .map((r) => r.chunk);
    }
    const lower = question.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    return this.graph.chunks
      .filter((c) => words.some((w) => c.cleanedText.toLowerCase().includes(w)))
      .slice(0, max);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
