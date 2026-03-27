# DISCUSS Decisions — cloud-sync-and-web

## Key Decisions
- [D1] Feature type: Cross-cutting (spans cloud infrastructure, mobile storage adapters, new web frontend)
- [D2] Walking skeleton first: Prove sync architecture E2E before building full web UI (see: story-map.md)
- [D3] JTBD included: Three jobs identified — comfortable editing (primary), data durability, cross-device sync (enabler) (see: jtbd-job-stories.md)
- [D4] UX depth: Lightweight — single persona, happy-path focus (see: journey-staple-management-visual.md)
- [D5] Sharing out of scope: User confirmed sharing with wife is distant "maybe", not current need
- [D6] Web app is dedicated: Not Expo Web reuse — purpose-built desktop UI for staple management
- [D7] Sync direction: Bidirectional (web↔cloud↔mobile). Trips stay local to phone.
- [D8] Conflict resolution: Last-write-wins (acceptable for single user)

## Requirements Summary
- Primary job: Comfortable staple/section management on a desktop web app with full keyboard
- Enabling requirement: Bidirectional cloud sync with offline-first mobile (store has spotty wifi)
- Side benefit: Data durability — cloud storage means data survives device loss
- Walking skeleton scope: Cloud backend + read-only web view + offline-first mobile loading

## Constraints Established
- Offline-first mobile is non-negotiable (spotty wifi at store)
- Existing ports-and-adapters architecture — cloud sync as new adapters, not a rewrite
- Single user — no auth/permissions complexity needed now
- Free/near-free backend cost (personal app)
- Web app is separate from mobile app (not Expo Web)

## Upstream Changes
- No DISCOVER artifacts exist — no upstream assumptions to change
