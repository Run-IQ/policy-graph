import { describe, it, expect } from 'vitest';
import { PolicyGraphMerger } from '../../src/merger/PolicyGraphMerger.js';
import { PolicyGraphError } from '../../src/errors.js';

describe('PolicyGraphMerger', () => {
  it("merge() throws 'Not implemented in v1'", () => {
    const merger = new PolicyGraphMerger();
    expect(() => merger.merge([])).toThrow(PolicyGraphError);
    expect(() => merger.merge([])).toThrow('Not implemented in v1');
  });
});
