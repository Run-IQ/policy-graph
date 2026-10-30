# @run-iq/policy-graph

Tools for working with a `PolicyGraph`: store its versions, navigate its nodes and edges, check whether it is ready to compile, diff two versions, and answer questions from the source text.

A `PolicyGraph` (defined in [`policy-dsl`](https://github.com/Run-IQ/policy-dsl)) is usually produced by [`policy-engine`](https://github.com/Run-IQ/policy-engine) from a document. Before compiling it, [`policy-bridge`](https://github.com/Run-IQ/policy-bridge) uses this package's navigator and health check.

## Install

The package is not on the public npm registry yet. Build it from source, next to a clone of `policy-dsl` (the dev dependency points to `../policy-dsl`):

```bash
git clone https://github.com/Run-IQ/policy-dsl
git clone https://github.com/Run-IQ/policy-graph
(cd policy-dsl && npm install && npm run build)
(cd policy-graph && npm install && npm run build)
```

Then add both to your project with `npm install ../policy-dsl ../policy-graph`. Requires Node.js 20 or later.

## Example

`delivery-policy.graph.json` holds a graph with one rule, `late_refund`: refund the customer when `delay_days` is greater than 3.

```ts
import { readFile } from 'node:fs/promises';
import {
  InMemoryPolicyGraphStore,
  PolicyGraphNavigator,
  PolicyGraphAnalyzer,
  PolicyGraphVersioning,
  PolicyGraphQA,
} from '@run-iq/policy-graph';
import type { PolicyGraph } from '@run-iq/policy-graph';

const graph: PolicyGraph = JSON.parse(await readFile('delivery-policy.graph.json', 'utf8'));

const store = new InMemoryPolicyGraphStore();
await store.save(graph);

const nav = new PolicyGraphNavigator(graph);
nav.getRuleNodes();                       // all Rule nodes
nav.getRequiredVariables('late_refund');  // variables used in that rule's condition
nav.getFlaggedNodes();                    // nodes below 0.8 confidence, or flagged

new PolicyGraphAnalyzer(graph).healthScore().readyForBridge; // true

// A new version where the threshold moved from 3 to 5 days
const v2 = structuredClone(graph);
v2.meta.version = '2';
v2.nodes[0].condition = { type: 'GT', left: { type: 'VAR', path: 'delay_days' }, right: { type: 'CONST', value: 5 } };
await store.save(v2);

const versioning = new PolicyGraphVersioning();
versioning.summarizeDiff(versioning.diff(graph, v2)); // '1 rule(s) modified'

const answer = await new PolicyGraphQA(graph).query('when is a delivery refunded?');
answer.sources; // [{ sourceRef: 'segment_0', text: 'When a delivery arrives more than 3 days late, ...' }]
```

## What's in it

| Class | |
|---|---|
| `InMemoryPolicyGraphStore` | Implements `PolicyGraphStore`: `save`, `get`, `getChunk`, `list`, `getHistory`, `delete`. Implement the same interface to use your own database. |
| `PolicyGraphNavigator` | Lookups by id, type, source chunk or model; parents, children, descendants and exceptions of a node; variables a rule needs; search by label. |
| `PolicyGraphAnalyzer` | Conflicts, coverage gaps, the nodes impacted by a change, and `healthScore()`. |
| `PolicyGraphVersioning` | Node-by-node diff between two versions of a graph. |
| `PolicyGraphQA` | Answers a question from the graph's source chunks (see below). |
| `PolicyGraphExporter` | `toJSON()`, and `toVisualizationData()` for drawing the graph (nodes and edges with colors). |

## Versions

A graph is identified by `meta.id` and `meta.version`. Versions are immutable: saving the same id and version twice throws `PolicyGraphVersionConflictError`. `get(id)` returns the latest version, `get(id, version)` a specific one.

`delete` only marks versions with a `deletedAt` date. The in-memory store still returns them from `get` and `list`.

## Health score

`healthScore()` starts from the average node confidence and subtracts penalties for critical conflicts, critical gaps, flagged nodes and rule nodes without a model. The graph is `readyForBridge` when the score is at least 0.7, there is no critical conflict, and every rule node has a model.

## Questions and answers

Without a language model, `PolicyGraphQA` returns the chunks whose text matches words of the question. With a `QALanguageModel` (a `generate` function, and optionally `embed`), it asks the model to answer from those chunks and cite their `sourceRef`. If the chunks carry embeddings and the model has `embed`, chunks are ranked by similarity instead of keywords.

`PolicyGraphMerger`, for combining graphs from several documents, is not implemented yet and throws.

## License

MIT
