---
title: Log Which Errors Agents Hit Most
impact: MEDIUM
tags: errors, observability, feedback
---

## Log Which Errors Agents Hit Most

The errors agents hit most often point at defects in the tool surface, not at
the agent. If half the failures are "invalid priority", the schema and the
server disagree (`high` vs `P1`) or the description does not say the format.
Count errors per tool and per message, review the top ones, and fix the
description, schema or default rather than the agent.

**Incorrect:** errors returned to the agent and dropped on the server.

**Correct:** every tool error logged with tool name, error class, and the
argument shape that caused it; the top entries reviewed on a schedule (see
`ops-assign-owner`).

Reference: Luca Rossi, Refactoring, 2026 ("log which errors agents hit most,
because many of them will point to the tool's surface").
