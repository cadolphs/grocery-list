# Decision records

Read these before proposing a change that spans several PRs. New records use
the next free number in `docs/adrs/` (highest `ADR-NNN` file plus one), follow the
template in ADR-009, end with **Revisit if**, and are listed here in the same
PR. Supersede instead of rewriting history. A PR that writes or supersedes a
record also updates the `adrs` lists in [`docs/primitives.md`](../primitives.md).

Every current record ends with **Revisit if**; superseded and stale records do
not need one.

Numbers below 009 collide (two sets were written in parallel). Cite records by
**file name**, not number.

## Rules agents must not break ("the no")

| Record | Decision |
| --- | --- |
| [ADR-009](ADR-009-no-classes-fp-only.md) | No classes: factory functions, pure domain functions, hooks |
| [ADR-010](ADR-010-no-direct-push-to-main.md) | No direct pushes to `main`: every change ships as a PR |
| [ADR-011](ADR-011-no-agent-prod-data-access.md) | Agents never touch production data or deploy by hand |

## Current

Each ADR number is used once. ADR-015, ADR-016 and ADR-017 were ADR-001
(Firestore backend), ADR-002 (React + Vite web app) and ADR-003 (email link
auth) until #87; the architecture, local storage and port bridge records kept
001 to 003. New records take the next free number.

| Record | Decision |
| --- | --- |
| [ADR-001-architecture-style-and-paradigm](ADR-001-architecture-style-and-paradigm.md) | Ports-and-adapters, functional TypeScript |
| [ADR-002-local-storage-strategy](ADR-002-local-storage-strategy.md) | Local storage strategy |
| [ADR-003-async-sync-port-bridge](ADR-003-async-sync-port-bridge.md) | Async/sync port bridge |
| [ADR-004-bottom-sheet-implementation](ADR-004-bottom-sheet-implementation.md) | Bottom sheet without gesture library |
| [ADR-005-house-area-type-migration](ADR-005-house-area-type-migration.md) | HouseArea as string |
| [ADR-006-section-order-storage-and-sort-override](ADR-006-section-order-storage-and-sort-override.md) | Section order storage and sort override |
| [ADR-007-email-password-auth-migration](ADR-007-email-password-auth-migration.md) | Email/password auth |
| [ADR-008-signout-listener-lifecycle](ADR-008-signout-listener-lifecycle.md) | Sign-out listener lifecycle invariant |
| [ADR-012](ADR-012-no-mandated-feature-workflow.md) | No mandated feature workflow; nWave retired |
| [ADR-013](ADR-013-tri-state-sweep-decision.md) | Tri-state sweep decision (undecided / needed / not-needed); area completion derived, not stored |
| [ADR-014](ADR-014-swipe-via-gesture-handler.md) | Row swipe as a 3-position slider via react-native-gesture-handler |
| [ADR-015-firestore-cloud-backend](ADR-015-firestore-cloud-backend.md) | Firestore as cloud backend |
| [product/adr-001-realtime-listener-integration](../product/architecture/adr-001-realtime-listener-integration.md) | Real-time listener integration |
| [product/adr-002-firestore-trip-storage](../product/architecture/adr-002-firestore-trip-storage.md) | Firestore trip storage adapter |
| [product/adr-004-legacy-section-order-wipe-migration](../product/architecture/adr-004-legacy-section-order-wipe-migration.md) | Wipe-on-detect for legacy section orders |
| [product/adr-005-aisle-subgrouping-domain-helper](../product/architecture/adr-005-aisle-subgrouping-domain-helper.md) | Aisle sub-grouping lives in the domain |

## Superseded or stale

| Record | Status |
| --- | --- |
| [ADR-017-email-link-auth](ADR-017-email-link-auth.md) | Superseded by ADR-007-email-password-auth-migration |
| [ADR-016-dedicated-web-app-react-vite](ADR-016-dedicated-web-app-react-vite.md) | Stale: there is no `web/` app; web ships as the Expo web export (`docs/deploy.md`) |
| [product/adr-003-web-email-password-auth](../product/architecture/adr-003-web-email-password-auth.md) | Stale with the separate web app above |
