# Planning board

The [Grocery List project board](https://github.com/users/cadolphs/projects/4)
is where product ideas are developed. It is not the issue tracker.

- **Board items** hold product thinking: the goal, the open questions, the
  decisions, and the spec. They are draft items, not repo issues, and they do
  not get `P0`-`P3`, `needs-decision`, or `friction` labels.
- **Repo issues** hold development work: one shippable change each, with the
  labels and triage rules in [AGENTS.md](../AGENTS.md).

The board is the memory between sessions. An agent or the maintainer picks up
an item, reads its body, and continues from there, so everything worth keeping
goes into the item body and not only into a chat.

## Stages

| Status      | Meaning                                                                 | Leaves when                                             |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Proposed    | An idea is logged. Nobody has worked on its open questions yet.         | Someone starts on the open questions.                   |
| Exploring   | The open questions are being discussed and researched.                  | Every open question has an answer.                      |
| Decided     | All open questions are answered and the body holds the spec.            | The first development issue is opened.                  |
| In progress | Development issues exist and are being built.                           | Every linked issue is closed and the change is live.    |
| Done        | Shipped. Also used for ideas that were dropped, with the reason stated. | Never: it stays as the record.                          |

Only the maintainer moves an item to **Decided** or drops it. Agents may log
ideas, move an item from Proposed to Exploring, write up research, and propose
answers.

## What an item contains

Keep the body current. It replaces itself; it is not a log.

```markdown
## Goal

What the user gets and why it matters.

## Open questions

- [ ] Question that still needs an answer
- [x] Answered question: the answer, in one line

## Decisions

- 2026-11-12: what was decided and why

## Spec

Behavior, scope, and what is out of scope. Filled in by the time the item is
Decided.

## Issues

- #123 first slice
```

A small idea needs only a goal and a status. A large one is broken into
several development issues once it is Decided; the board item stays as the
description of the overall product goal, and each issue links back to it.

## Working with the board

Use the board CLI (`npm run board`, which runs the `board` command of
[cad-skills](https://github.com/cadolphs/cad-skills) through `npx`); the
[planning-board skill](../.claude/skills/planning-board/SKILL.md) says when.

```sh
npm run board -- list                      # items in stage order, numbered
npm run board -- show <item>               # title, status, body
npm run board -- add "<idea>" --body-file <path>
npm run board -- body <item> --body-file <path>
npm run board -- move <item> Exploring
npm run board -- move <item> Decided --maintainer-said "<their words>"
npm run board -- move <item> "In progress" --issue 31,32
npm run board -- statuses
```

The CLI reads which board to use from `.github/board.json` and looks up the
stage names on GitHub, so renaming or adding a stage there needs no other
change. Two stages carry rules: a move to **Decided** needs the maintainer's
words and records them under Decisions; a move to **In progress** needs the
issue numbers and lists them under Issues. If either stage is renamed, name the
new one in `.github/board.json` (`"stages": { "decided": "...", "inProgress":
"..." }`) and update the table above.

The `gh` token needs the `project` scope (`gh auth refresh -s project`). Cloud
sessions may not have it: when the board cannot be reached, say so and put the
notes in the PR or issue instead.

## Rules for agents

- Before starting feature or product work, check the board for an item that
  covers it and read the body.
- Do not build from an item that is Proposed or Exploring. Help answer its open
  questions instead.
- When a session ends with unanswered questions or new findings on an item,
  write them into the body before stopping.
- When opening the first development issue for a Decided item, list the issue
  under **Issues** and move the item to In progress.
- Bugs, friction, and cleanup go straight to repo issues, not to the board.
