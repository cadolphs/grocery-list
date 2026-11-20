---
title: Self-Host When Internal; Managed When Remote and Listed. Write the Reason Down
impact: MEDIUM
tags: ops, hosting, decision
---

## Self-Host When Internal; Managed When Remote and Listed. Write the Reason Down

Decide by how much of the production lifecycle applies:

- **Self-host** when the server is internal (stdio or one team's IDE), the
  blast radius is low, you accept owning SDK upgrades when the protocol
  changes, and you are not listed in marketplaces.
- **Managed** when you ship a remote server as part of the product across
  several directories, want cross-client test suites against real hosts and
  checks before each submission, and that work sits on your critical path
  without being what makes the product special.

Whichever you pick, record the reason (an ADR in this repo) so the choice is
revisited when the facts change, for example when the server goes from
household-only to listed.

For this app: a single-household server leans self-host (low blast radius,
no directories), but it is remote and in front of Firestore auth, which is the
high-tier part; the decision belongs on the board item, then in an ADR.

Reference: Luca Rossi, Refactoring, 2026 (self-host vs managed section;
Manufact's MCP cloud is the managed example given, with mcp-use underneath:
https://github.com/mcp-use/mcp-use).
