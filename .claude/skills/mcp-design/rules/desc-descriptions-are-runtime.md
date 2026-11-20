---
title: Descriptions Are Runtime, Not Docs
impact: HIGH
tags: descriptions, naming, review
---

## Descriptions Are Runtime, Not Docs

Developers read API docs once and internalize the patterns. Agents re-read
tool names and descriptions on every turn and decide what to call from that
alone. A description is a prompt, and changing one sentence changes behavior
as much as changing code.

1. Name tools the way a user would phrase the request.
2. Use the description for what drives behavior: constraints, preconditions,
   and when not to use the tool (see `desc-point-to-sibling-tool`).
3. Put description edits through review and testing like code.

**Incorrect (named after the port, describes the implementation):**

```ts
server.registerTool("tripItemUpsert", {
  description: "Upserts a TripItem document in Firestore.",
  ...
});
```

**Correct (named after the request, describes behavior and limits):**

```ts
server.registerTool("mark_bought", {
  description:
    "Mark items on the current trip as bought. Needs an active trip (start one with start_trip). " +
    "Items are matched by name against what is needed; unmatched names are returned, not added.",
  ...
});
```

Reference: Luca Rossi, Refactoring, 2026; Sentry MCP `search_errors` tool
(https://github.com/getsentry/sentry-mcp/blob/main/packages/mcp-core/src/tools/catalog/search-errors.ts).
