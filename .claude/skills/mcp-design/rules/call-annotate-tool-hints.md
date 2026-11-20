---
title: Declare Read-Only, Destructive and Idempotent Hints
impact: MEDIUM
tags: calls, annotations, confirmation, protocol
---

## Declare Read-Only, Destructive and Idempotent Hints

The MCP spec defines tool annotations (`readOnlyHint`, `destructiveHint`,
`idempotentHint`, `openWorldHint`). Hosts use them to decide when to ask the
user for confirmation; Block's Goose does. A tool without them is treated by
the host's default, which may be either too cautious or not cautious enough.

Set them on every tool, truthfully: a hint that says read-only on a tool that
writes removes the user's chance to confirm, and under-declaring idempotency
makes a host refuse to retry a timed-out call. Destructive and idempotent are
independent: a delete by name is both.

```ts
annotations: { readOnlyHint: true }                                            // whats_needed
annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } // mark_bought
annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }  // delete_staple: a second delete of the same names changes nothing
annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false } // decrement_quantity: each call takes one more
```

Reference: MCP specification, ToolAnnotations
(https://modelcontextprotocol.io/specification/draft/schema#toolannotations);
Block, "Block's playbook for designing MCP servers"
(https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers).
Via Luca Rossi, Refactoring, 2026.
