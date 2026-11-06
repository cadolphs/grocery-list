# ADR-012: No mandated feature workflow — nWave retired

Status: accepted Date: 2026-11-06

## Decision

nWave is no longer this repo's workflow. No change has to pass through the
wave sequence (discover, discuss, design, distill, deliver), a Definition of
Ready gate, a `roadmap.json`, or DES phase logging, and agents do not have to
use the `nw-*` agents or skills.

A change is ready when it meets the gates in `AGENTS.md`: `npm run verify`, the
risk tier for what it touches, control CLI proof where the tier asks for it,
and the ship-pr loop. How much upfront analysis a change gets is a judgment
call per change.

`docs/feature/` and `docs/evolution/` stay as history. Do not add new wave
folders there and do not delete the existing ones: decision records and code
comments link into them. `docs/product/jobs.yaml` stays as product context;
new work does not have to reference a job id. Feature and product work is
tracked on the project board linked from `AGENTS.md`.

## Why

The wave sequence felt rigid for a one-maintainer app, and agents now need less
scaffolding to deliver a change well. The gates that protect quality (the
verify gate, risk tiers, real-app proof, mutation testing on domain and ports)
do not depend on nWave.

This supersedes the "TDD approach via nWave methodology" context in
ADR-001-architecture-style-and-paradigm; the architecture decision there stands.

## Revisit if

Changes start shipping with missed requirements or rework that upfront
discovery would have caught, or more than one person works on the app and needs
a shared process.
