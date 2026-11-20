---
title: Say When Not to Use a Tool, and What to Use Instead
impact: HIGH
tags: descriptions, disambiguation
---

## Say When Not to Use a Tool, and What to Use Instead

When several tools overlap, the agent picks by description. A "NOT for"
clause that names the sibling tool removes the wrong choice before it happens.

Sentry's `search_errors` description:

> Search Sentry error events: exceptions and crashes with stack traces. Use for
> error counts, statistics, trends, and individual error events.
>
> NOT for log messages, including error/warning logs (use search_logs),
> requests or latency (use search_traces), or grouped issue lists (use
> search_issues).

**Incorrect (overlapping tools, no boundary):**

```ts
"whats_needed": "Returns the grocery list."
"list_staples": "Returns the staples."
```

**Correct:**

```ts
"whats_needed": "What the household still needs to buy right now. NOT the full staples library (use list_staples) and NOT past trips."
"list_staples": "The household's staples library with sections. NOT what is currently needed (use whats_needed)."
```

Reference: Sentry MCP source
(https://github.com/getsentry/sentry-mcp/blob/main/packages/mcp-core/src/tools/catalog/search-errors.ts),
via Luca Rossi, Refactoring, 2026.
