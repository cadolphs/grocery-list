---
title: An Error Says What, Why, and What to Try Instead
impact: HIGH
tags: errors, recovery
---

## An Error Says What, Why, and What to Try Instead

Deterministic software fails and a developer reads the logs later. An agent
reads the error now and tries again, so the error text is the next prompt.
A bare `{"code": 400}` wastes that attempt. Include the expected format, an
example, or the tool to use instead.

Block's Goose, for files over 400KB:

> File '{}' is too large ({:.2}KB). Maximum size is 400KB to prevent memory
> issues. If needed, use shell commands like 'head', 'tail', or 'sed -n' to
> read a subset of the file.

What went wrong, why, what to try.

**Incorrect:**

```ts
throw new Error("invalid section");
```

**Correct:**

```ts
throw new Error(
  `Unknown section "${section}". Sections are: ${SECTIONS.join(", ")}. ` +
  `Omit section to use the staple's own, or call list_staples to see where each staple lives.`
);
```

Reference: Block, "Block's playbook for designing MCP servers"
(https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers),
via Luca Rossi, Refactoring, 2026.
