---
title: Fewer Than Seven Workflows; Delete Endpoint-Dump Tools
impact: HIGH
tags: shape, surface, context
---

## Fewer Than Seven Workflows; Delete Endpoint-Dump Tools

The tool list is re-read by the model on every turn inside a limited context
window. Every tool that serves no real workflow costs tokens and dilutes the
choice among the ones that do.

Start by listing the most important agent workflows (the source suggests under
seven), then delete every tool that does not serve one of them. A tool that
exists because the endpoint exists is a candidate for deletion.

**Incorrect:** 30+ tools mirroring the API (Block's first Linear server).

**Correct:** a handful of job-shaped tools, each traceable to a workflow on
the list.

Reference: Luca Rossi, Refactoring, 2026, checklist item 1; Block, "Block's
playbook for designing MCP servers"
(https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers).
