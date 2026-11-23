# ADR-013: Tri-state sweep decision, derived area completion

Status: accepted Date: 2026-11-23

## Decision

A staple on the trip carries a **decision**: `undecided`, `needed`, or
`not-needed`. It replaces the `needed: boolean` on `TripItem`. Every staple
starts `undecided` on a new trip. One-offs are always `needed` and never take
part in the sweep.

A house area is **complete** when none of its staples is `undecided`. This is
derived from the items, never stored; the `completedAreas` set on `Trip` goes
away. The area's Done button is a bulk action (every `undecided` staple in the
area becomes `not-needed`), and Undo returns every `not-needed` staple in the
area to `undecided`.

Finish Trip carries over only staples that are `needed` and not in the cart;
they start the next trip `needed`. Everything else starts `undecided`. Stored
trips migrate `true` → `needed`, `false` → `not-needed`, and drop
`completedAreas`.

## Why

With a boolean, "needed" and "not looked at yet" are the same value, so the
sweep could not show where in the house you still had to go, and a stored
`completedAreas` flag could disagree with the items under it. A third state
makes progress a fact about the items, and "all areas complete" stops being a
thing you declare.

Considered and rejected: keeping the boolean plus the stored
`completedAreas` (progress still invisible per item); `undecided` as a flag
next to `needed` (two fields, four combinations, one of them meaningless);
treating `undecided` as `not-needed` at some end-of-sweep step (the sweep has no
end step, the shopping list is live).

The decision names (`decision`, `undecided`, `needed`, `not-needed`) are the
glossary's; `skip`/`unskip` and "skipped" are retired.

## Revisit if

More than one person sweeps the same house at once and bulk Done/Undo keeps
clobbering the other person's decisions, or a fourth state ("check later",
"ask partner") is wanted more than once.
