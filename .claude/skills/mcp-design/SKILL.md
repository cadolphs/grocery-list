---
name: mcp-design
description: Design rules for an MCP server that exposes this app to AI agents (which tools exist, names and descriptions, schemas, idempotent writes, errors, host testing, hosting). Use when working the "Connect the list to an AI" board item, when writing or reviewing a tool name, description, schema or error message, and before deciding where an MCP server runs. Cite rule ids in specs and PRs.
metadata:
  source: Luca Rossi, Refactoring newsletter (with Luigi Pederzani, Manufact), 2026
  version: "1.0.0"
---

# MCP design rules

Distilled from Luca Rossi's Refactoring essay on designing MCP servers (2026,
written with Luigi Pederzani of Manufact), which pulls from Notion, Block,
Stripe and Sentry. One rule per file under `rules/`, each with the source it
came from, so a rule can be checked against its origin and re-pruned.

The core shift: the caller is an agent, not deterministic software. It reads
tool names and descriptions on every turn, improvises arguments, retries, and
recovers from errors on its own. Every rule below follows from that.

## When to apply

- Answering the open questions on the
  [Connect the list to an AI](https://github.com/users/cadolphs/projects/4)
  board item (`npm run board -- show 2`): which operations, integration shape,
  where it runs.
- Writing or reviewing a tool: its name, description, input schema, result
  shape, error text, annotations.
- Deciding self-host vs managed, or adding an MCP host to test against.

Risk tier: an MCP server in front of Firestore touches auth and
`firestore.rules`, so it is **high** per `AGENTS.md` whatever these rules say.

## Rule categories

### 1. Shape: which tools exist (HIGH)

- `shape-jobs-not-endpoints` - Design one tool per user job, not one per API endpoint
- `shape-one-or-two-calls` - A tool finishes its job in one or two calls; batch reads, expose intermediate state
- `shape-small-tool-surface` - Fewer than seven workflows; delete endpoint-dump tools

### 2. Descriptions: the prompt the agent reads every turn (HIGH)

- `desc-descriptions-are-runtime` - Name tools as the user would phrase the request; descriptions carry constraints and preconditions; review edits like code
- `desc-point-to-sibling-tool` - Say when NOT to use a tool and which tool to use instead

### 3. Calls: the caller improvises (HIGH)

- `call-strict-schema-safe-defaults` - Strict schemas where it matters, safe defaults everywhere else
- `call-idempotent-writes` - Risky writes take an idempotency key; a retry returns the first result
- `call-annotate-tool-hints` - Declare readOnly, destructive and idempotent hints so hosts can ask before acting
- `call-refuse-high-stakes` - Refuse high-stakes actions with a clear message and a human path

### 4. Errors: teach the next attempt (HIGH)

- `error-teach-next-attempt` - An error says what went wrong, why, and what to try instead
- `error-log-top-errors` - Log which errors agents hit most; they point at tool-surface defects

### 5. UI (LOW)

- `ui-job-may-carry-ui` - A tool can ship its own HTML view (MCP Apps) when the user needs to see or touch the result

### 6. Ops: keeping it healthy (MEDIUM)

- `ops-test-across-hosts` - Golden prompts on at least three real hosts; one host hides bugs another trips on
- `ops-track-protocol-revisions` - The protocol changes fast and clients update without you; adopt revisions early
- `ops-directory-distribution` - Each agent directory has its own packaging and review; keep the endpoint stable
- `ops-assign-owner` - One owner for MCP health, with a re-check after every major host or protocol release
- `ops-self-host-vs-managed` - Self-host when internal and low blast radius; managed when remote and listed in directories. Write the reason down

## Checklist (from the source's "next week" list)

1. List the agent workflows that should exist (under seven); delete tools that serve none of them.
2. Rewrite tool names and descriptions as prompts; put description edits through review.
3. Add actionable errors and idempotent writes to the risky tools.
4. Pick three hosts and run a golden-prompt test of the full experience, UI and permissions included.
5. Assign an owner for MCP health, re-checked after every major MCP, Claude or ChatGPT release.
6. Decide self-host vs managed for deploy, test, monitor and publish, and write down why.

## Applied to this app (not decided)

The board item is not Decided; this is how the rules frame its open
questions, not a spec.

- Jobs, not endpoints: the household says "add milk and the stuff for tacos",
  "what do we still need?", "we got the eggs". Candidate tools follow those
  phrases (`add_to_list`, `whats_needed`, `mark_bought`), not the ports
  (`staples`, `trip`, `sections`).
- Idempotency matters on the first day: a retried "add milk" must not produce
  two milks.
- Errors should name the valid sections and staples when a match fails,
  because the agent will try again on its own.
- Auth and hosting are the high-tier part (`firestore.rules`, the test
  account); `ops-self-host-vs-managed` and `call-refuse-high-stakes` apply.
