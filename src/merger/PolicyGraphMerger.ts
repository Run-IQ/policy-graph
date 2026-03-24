import type { PolicyGraph } from '@run-iq/policy-dsl';
import { PolicyGraphError } from '../errors.js';

export class PolicyGraphMerger {
  merge(_graphs: PolicyGraph[]): PolicyGraph {
    throw new PolicyGraphError('Not implemented in v1');
  }
}
