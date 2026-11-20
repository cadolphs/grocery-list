---
title: Adopt Protocol Revisions Early; Clients Update Without You
impact: MEDIUM
tags: ops, protocol, upgrades
---

## Adopt Protocol Revisions Early; Clients Update Without You

In about 18 months MCP went from HTTP+SSE to Streamable HTTP, tightened OAuth,
and shipped the 2026-07-28 revision, which the maintainers call the largest
since launch: sessions and the initialize handshake are gone, every request is
self-contained, and auth changed substantially (per the source; confirm
against the spec when building).

MCP is a client-server protocol. Even when the server code does not change,
the clients will, so a server that lags a revision breaks from the outside.
Track the spec and SDK releases and upgrade promptly; this is a standing cost
of owning a server (see `ops-self-host-vs-managed`).

Reference: MCP blog, 2026-07-28 release candidate
(https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/),
via Luca Rossi, Refactoring, 2026.
