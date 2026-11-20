---
title: A Tool Finishes Its Job in One or Two Calls
impact: HIGH
tags: shape, granularity, batching, state
---

## A Tool Finishes Its Job in One or Two Calls

Granularity has a cost on both ends:

- Too fine: every extra hop is LLM seconds times N, on top of a confused tool
  choice.
- Too coarse: one mega-tool with a kitchen-sink schema makes arguments
  brittle, recovery hard, and auth messy.

Default to tools that finish a job in one or two calls. Batch related reads
into one tool. Keep multi-step flows only for domains that need them, and when
you do, return the intermediate state explicitly so the agent can continue
without guessing what happened.

**Incorrect (agent must remember state the server does not return):**

```ts
// start_trip returns { ok: true }
// mark_bought needs a tripId the agent never saw
```

**Correct (each step returns what the next step needs):**

```ts
// start_trip returns { tripId, store, sections: [...], itemsNeeded: [...] }
// mark_bought({ tripId, items }) returns { tripId, remaining: [...] }
```

Reference: Luca Rossi, Refactoring, 2026 ("a good default is tools that finish
a job in one or two calls, batching related reads when you can").
