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

```sh
# List items with their status
gh project item-list 4 --owner cadolphs --format json

# Log an idea (lands without a status: set it to Proposed)
gh project item-create 4 --owner cadolphs --title "<idea>" --body "<body>"

# Update the body of a draft item (id starts with DI_, from item-list `content.id`)
gh project item-edit --id <DI_id> --title "<title>" --body "<new body>"

# Move an item (item id starts with PVTI_)
gh project item-edit --project-id PVT_kwHOANQEpM4BqgaJ --id <PVTI_id> \
  --field-id PVTSSF_lAHOANQEpM4BqgaJzho3Qaw --single-select-option-id <option>
```

Status option ids: Proposed `88c40976`, Exploring `b09522c2`, Decided
`ad22cf85`, In progress `307328d3`, Done `da6a38de`.

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
