---
title: One Owner for MCP Health
impact: MEDIUM
tags: ops, ownership
---

## One Owner for MCP Health

An MCP server decays from the outside: hosts update, the protocol revises,
directories change their review rules, and the top error list drifts. Assign
one owner for its health, with a re-check after every major MCP, Claude or
ChatGPT release: run the golden prompts (`ops-test-across-hosts`), read the
top errors (`error-log-top-errors`), confirm the protocol version.

For this repo, "owner" is the maintainer, and the re-check is a recurring
item, not an issue filed when something breaks.

Reference: Luca Rossi, Refactoring, 2026, checklist item 5.
