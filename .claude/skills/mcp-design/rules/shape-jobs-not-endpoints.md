---
title: Design One Tool per User Job, Not per Endpoint
impact: HIGH
tags: shape, granularity, jobs
---

## Design One Tool per User Job, Not per Endpoint

The most common mistake is mapping each REST or GraphQL endpoint to a tool.
Endpoints are built around resources and CRUD verbs, which suits software that
already knows what it wants. An agent is completing a job for a user ("file
this bug with a repro and an assignee", "add the stuff for tacos"). When jobs
sit far from single endpoints, the agent burns tokens finding the right path,
chains five calls where one would do, and may still fail the job.

Work top-down: list the end-to-end workflows people actually ask an agent to
do with the product, then design one tool, or a tight chain, for each.

**Incorrect (endpoint dump; "add milk and tortillas" is five calls):**

```ts
server.registerTool("get_staples", ...);
server.registerTool("get_trip", ...);
server.registerTool("create_trip_item", ...);
server.registerTool("set_staple_needed", ...);
server.registerTool("update_trip_item", ...);
```

**Correct (one job, one call; matching moves inside the server):**

```ts
server.registerTool("add_to_list", {
  description: "Add groceries to the household list by name. Matches known staples, creates one-off items for the rest.",
  inputSchema: { items: z.array(z.string()).min(1) },
}, async ({ items }) => addToList(items));
```

Notion's first open-source server mapped each block endpoint 1:1; agents had
to edit pages block by block. The hosted server dropped block tools entirely:
pages go in and out as Markdown in one call, and the Markdown-to-blocks work
moved inside the server. Block's first internal Linear server had 30+ tools
mirroring the API; "what issues is bob working on" took four to six calls.

Reference: Notion, "Notion's hosted MCP server: an inside look"
(https://www.notion.com/blog/notions-hosted-mcp-server-an-inside-look); Block,
"Block's playbook for designing MCP servers"
(https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers).
Via Luca Rossi, Refactoring, 2026.
