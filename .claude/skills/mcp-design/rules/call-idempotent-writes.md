---
title: Risky Writes Take an Idempotency Key
impact: HIGH
tags: calls, idempotency, retries, writes
---

## Risky Writes Take an Idempotency Key

Agents and hosts retry. A write that creates something on every call turns a
retry into a duplicate. Stripe's rule for its API: every POST accepts an
`Idempotency-Key`, and a retry with the same key returns the first response
instead of creating a second object. Do the same on MCP tools with an
idempotency key argument, and declare the behavior with tool annotations (see
`call-annotate-tool-hints`).

**Incorrect ("add milk" retried twice gives two milks):**

```ts
server.registerTool("add_to_list", { inputSchema: { items: ... } },
  async ({ items }) => createItems(items));
```

**Correct (same key, same result, one write):**

```ts
server.registerTool("add_to_list", {
  inputSchema: {
    items: z.array(z.string()).min(1),
    idempotencyKey: z.string().describe("Any unique string for this request; reuse it to retry safely"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
}, async ({ items, idempotencyKey }) => withIdempotency(idempotencyKey, () => createItems(items)));
```

For this app, "add X" matched against existing staples is naturally
idempotent (set `needed`); only one-off item creation needs the key.

Reference: Stripe, idempotent requests
(https://docs.stripe.com/api/idempotent_requests), via Luca Rossi,
Refactoring, 2026.
