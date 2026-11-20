---
title: A Tool Can Ship Its Own View
impact: LOW
tags: ui, mcp-apps, host-specific
---

## A Tool Can Ship Its Own View

With MCP Apps, a tool can point to an HTML resource that the host renders in a
sandbox, so the product shows its own interface inside the conversation. Use
it for jobs where the user wants to see and touch the result (select an item
on a canvas, tick things off a list) and where describing state back and forth
in text would be worse. The app can also tell the agent what the user
selected.

ChatGPT's MCP Extensions go further (sidebar launcher, conversation tab, file
handlers) but are host-specific and partly desktop-only. Treat anything beyond
plain MCP Apps as a per-host investment (see `ops-directory-distribution`).

For this app: a store-view checklist rendered in the conversation is the
obvious candidate; it is a later slice, not the first.

Reference: MCP Apps extension
(https://modelcontextprotocol.io/extensions/apps/overview); Luigi Pederzani,
"OpenAI MCP Extensions" (https://manufact.com/blog/openai-mcp-extensions). Via
Luca Rossi, Refactoring, 2026.
