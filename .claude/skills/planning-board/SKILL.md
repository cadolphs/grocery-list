---
name: planning-board
description:
  Read and update the planning board, where product ideas, open questions,
  decisions, and specs live between sessions. Use before starting feature or
  product work, when the maintainer raises or decides an idea, and before
  ending a session that leaves open questions or new findings.
---

# Planning board

The board holds product thinking as draft items; repo issues hold development
work. Stages, the item body shape, and who may move what are in
[docs/planning-board.md](../../../docs/planning-board.md).

```sh
npm run board -- list                      # items in stage order, numbered
npm run board -- list --status Exploring
npm run board -- show <item>               # title, status, body
npm run board -- add "<idea>" --body-file <path>      # lands in the first stage
npm run board -- body <item> --body-file <path>       # replace the body
npm run board -- move <item> Exploring
npm run board -- move <item> Decided --maintainer-said "<their words>"
npm run board -- move <item> "In progress" --issue 31,32
npm run board -- statuses                  # current stage names and meanings
```

`<item>` is the number from `list` or a unique part of the title. Add `--json`
for JSON. Stage names come from GitHub: run `statuses` instead of assuming.

## When

1. **Starting feature or product work**: `list`, then `show` the item that
   covers it. Build only from an item that is Decided or In progress. For one
   that is Proposed or Exploring, work on its open questions instead.
2. **A new idea comes up** (from the maintainer, or one you want to raise):
   `add` it with at least a Goal. Do not open a repo issue for it.
3. **You start on an item's open questions**: `move` it to Exploring.
4. **Before the session ends**: write answers, findings, and remaining
   questions into the body with `body`. The body is the current state, not a
   log: rewrite it, keep it short. The next session has only this.
5. **The maintainer decides**: make sure the Spec section is filled, then
   `move` to Decided with their words. Never move an item to Decided, or drop
   it, on your own judgment.
6. **Opening development issues** for a Decided item: file the issues (with
   priority labels, per `AGENTS.md`), link the board item in each, then `move`
   to In progress with `--issue`.
7. **Every linked issue is closed and live**: `move` to Done.

To edit a body: `show` it, write the new version to a file under `.control/`
or a temp directory, then `body --body-file`.

## When the board cannot be reached

The CLI needs a `gh` token with the `project` scope and says so when it is
missing. Do not work around it: put the notes in the PR or issue, and say in
your summary that the board was not updated.
