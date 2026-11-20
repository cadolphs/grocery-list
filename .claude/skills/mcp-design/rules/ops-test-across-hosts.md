---
title: Golden Prompts on at Least Three Real Hosts
impact: HIGH
tags: ops, testing, hosts, evals
---

## Golden Prompts on at Least Three Real Hosts

The server is called by ChatGPT, Claude, and a long tail of clients, each
with its own behavior and update cycle. The same server produces different
outcomes across them: in Manufact's issue-tracker example, Codex worked around
server bugs and passed while Claude failed the same suite on defects in the
tools. Testing with one favorite client ships bugs you never see.

Make a set of golden prompts (the real workflows from
`shape-small-tool-surface`) part of normal QA, run on at least three hosts,
covering the full experience: tool choice, UI, and permission prompts.

**Incorrect:** manual checks in one client before release.

**Correct:** a prompt suite with expected outcomes, run against three hosts
before each change to a tool or description, and again after major host
releases (`ops-assign-owner`).

Reference: Manufact, "MCP evals with coding agents"
(https://manufact.com/blog/mcp-evals-coding-agents), via Luca Rossi,
Refactoring, 2026.
