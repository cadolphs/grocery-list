# Wave Decisions: correct-sync-behavior (DISCUSS)

## Decision 1: Feature Type

**Cross-cutting** -- spans data layer (storage ports and adapters), domain logic (trip/staple interaction), hooks layer (initialization and re-rendering), and indirectly all views (sweep, whiteboard, shopping).

## Decision 2: Walking Skeleton

**No** -- brownfield. Existing hexagonal architecture with ports, adapters, and Firestore patterns to follow. The `firestore-staple-storage.ts` and `firestore-area-storage.ts` adapters establish the pattern.

## Decision 3: UX Research Depth

**Lightweight** -- the UX itself does not change. This is a data synchronization fix. The user's expectation is: "my grocery list should look the same on all my devices without restarting." No new screens, no new flows, no new interactions.

## Decision 4: JTBD

**Skipped** -- the job is clear from the user interview: "When I'm planning a grocery trip across phone and laptop, I want changes to appear on the other device within seconds, so I can plan fluidly without restarting the app or losing work."

## Risk: No DIVERGE Artifacts

No `docs/feature/correct-sync-behavior/diverge/` artifacts exist. This feature was discovered through direct user-reported breakage rather than a formal discovery cycle. The problem is well-understood from code investigation and user interview.

## Scope Note

This feature touches 3 bounded contexts: trip storage, staple-to-trip integration, and Firestore sync infrastructure. Assessed as right-sized (see story-map.md).
