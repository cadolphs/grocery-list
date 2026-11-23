# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

These are **state** labels. They sit alongside, not instead of, this repo's existing labels: `P0`..`P3` (priority, required on every agent-filed issue), `needs-decision` (waits on the maintainer's product or one-way-door call; agents skip), `friction` / `friction-skipped`, and `eas-preview`. `needs-decision` is not `needs-info`: the first waits on the maintainer, the second on the reporter.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.
