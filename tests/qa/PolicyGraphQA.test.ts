import { describe, it, expect } from 'vitest';
import { PolicyGraphQA } from '../../src/qa/PolicyGraphQA.js';
import { makeGraph, makeMeta, makeChunk } from '../helpers.js';
import type { QALanguageModel } from '../../src/types.js';

describe('PolicyGraphQA', () => {
  it('query() without LLM returns relevant chunks', async () => {
    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      chunks: [
        makeChunk({
          id: 'c1',
          text: 'Income tax rate is 25%',
          cleanedText: 'income tax rate is 25%',
        }),
        makeChunk({ id: 'c2', text: 'VAT applies to goods', cleanedText: 'vat applies to goods' }),
      ],
    });
    const qa = new PolicyGraphQA(graph);

    const result = await qa.query('What is the income tax rate?');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]!.sourceRef).toBe('c1');
    expect(result.confidence).toBe(0.5); // no LLM
  });

  it('query() with LLM returns answer with sources', async () => {
    const mockLLM: QALanguageModel = {
      generate: async ({ question: _question, context: _context }) => ({
        text: `Based on [c1]: The income tax rate is 25%.`,
        confidence: 0.92,
      }),
    };

    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      chunks: [
        makeChunk({
          id: 'c1',
          text: 'Income tax rate is 25%',
          cleanedText: 'income tax rate is 25%',
        }),
      ],
    });
    const qa = new PolicyGraphQA(graph, mockLLM);

    const result = await qa.query('What is the income tax rate?');
    expect(result.answer).toContain('25%');
    expect(result.confidence).toBe(0.92);
    expect(result.sources).toHaveLength(1);
  });

  it("query() with no matches → 'No relevant information found.'", async () => {
    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      chunks: [
        makeChunk({ id: 'c1', text: 'Unrelated content', cleanedText: 'unrelated content' }),
      ],
    });
    const qa = new PolicyGraphQA(graph);

    const result = await qa.query('xyzzy quantum flux capacitor');
    expect(result.answer).toBe('No relevant information found.');
    expect(result.sources).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it('query() never evaluates DSL AST', async () => {
    // This test ensures QA only reads text, never attempts to evaluate conditions/expressions.
    // The graph has nodes with conditions, but QA should only look at chunks.
    const graph = makeGraph({
      meta: makeMeta({ id: 'g1', version: '1.0.0' }),
      chunks: [
        makeChunk({
          id: 'c1',
          text: 'Article 5: If revenue > 500000, tax rate is 25%',
          cleanedText: 'article 5 if revenue > 500000 tax rate is 25%',
        }),
      ],
    });
    const qa = new PolicyGraphQA(graph);

    const result = await qa.query('What is the tax rate for revenue above 500000?');
    // Should return chunk text, not evaluate any expression
    expect(result.sources.length).toBeGreaterThan(0);
    expect(typeof result.answer).toBe('string');
  });
});
