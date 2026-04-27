# Outcome KPIs

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27

Single-user app (Carlos). KPIs are observational / self-reported, not telemetry.

## KPI 1 — Aisle Orientation Accuracy

- **Who**: Carlos.
- **Does what**: Names the aisle of the next item to check, without inspecting individual item metadata.
- **By how much**: Correct on 100% of mid-shop self-checks across 3 trips post-deploy.
- **Measured by**: Self-reported during Carlos's next 3 grocery trips. One-line note per trip in a hand-kept log: "could I tell which aisle I was in without re-checking? Y/N".

## KPI 2 — Aisle Closure Cue

- **Who**: Carlos.
- **Does what**: Decides to leave a finished aisle without re-scanning items.
- **By how much**: 0 instances of "did I miss anything in aisle N?" backtracks across 3 trips post-deploy.
- **Measured by**: Self-reported note per trip: "did I backtrack into a finished aisle? Y/N + count".

## KPI 3 — No Regression in Section Progress

- **Who**: Carlos.
- **Does what**: Continues to read section-level `X of Y` and `✓` exactly as before.
- **By how much**: 0 perceived regressions in section header behaviour.
- **Measured by**: Existing section-level tests stay green; manual smoke check on first dogfood trip.

## KPI 4 — No Visual Clutter on Aisle-less Sections

- **Who**: Carlos.
- **Does what**: Reads `Produce` and other null-aisle sections as flat lists.
- **By how much**: 0 spurious sub-headers in all-null sections; 0 redundant single-aisle badges.
- **Measured by**: Visual inspection of `Produce`, `Deli`, and any single-aisle section after slice 01 ships.
