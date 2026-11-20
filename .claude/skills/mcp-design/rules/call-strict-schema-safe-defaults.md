---
title: Strict Schemas Where It Matters, Safe Defaults Elsewhere
impact: HIGH
tags: calls, schema, defaults, validation
---

## Strict Schemas Where It Matters, Safe Defaults Elsewhere

The caller improvises: it invents argument shapes, calls tools out of order,
retries oddly, forgets that setup already happened, and the host may retry on
its behalf. Defend with the schema: strict types and enums on the arguments
that can do damage, defaults for everything the agent is likely to omit.

Half of a server's failures can be one mismatch, such as the schema saying
`high` while the server expects `P1`. The schema and the server must agree,
and the schema should say it (see `error-log-top-errors`).

**Incorrect (free-form string, server rejects most values):**

```ts
inputSchema: { priority: z.string() } // server accepts only "P1" | "P2"
```

**Correct (enum matches the server; optional fields default):**

```ts
inputSchema: {
  items: z.array(z.string()).min(1),
  section: z.enum(SECTIONS).optional().describe("Defaults to the staple's own section"),
}
```

Reference: Luca Rossi, Refactoring, 2026 ("strict schemas where it matters,
safe defaults, and idempotent writes on anything risky"); see also
"How to Design APIs for an AI World"
(https://refactoring.fm/p/how-to-design-apis-for-an-ai-world).
