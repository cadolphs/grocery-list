# Decision records

Read these before proposing a change that spans several PRs. New records use
the next free number in `docs/adrs/` (currently **ADR-012**), follow the
template in ADR-009, end with **Revisit if**, and are listed here in the same
PR. Supersede instead of rewriting history. A PR that writes or supersedes a
record also updates the `adrs` lists in [`docs/primitives.md`](../primitives.md).

Numbers below 009 collide (two sets were written in parallel). Cite records by
**file name**, not number.

## Rules agents must not break ("the no")

| Record | Decision |
| --- | --- |
| [ADR-009](ADR-009-no-classes-fp-only.md) | No classes: factory functions, pure domain functions, hooks |
| [ADR-010](ADR-010-no-direct-push-to-main.md) | No direct pushes to `main`: every change ships as a PR |
| [ADR-011](ADR-011-no-agent-prod-data-access.md) | Agents never touch production data or deploy by hand |

## Current

| Record | Decision |
| --- | --- |
| [ADR-001-architecture-style-and-paradigm](ADR-001-architecture-style-and-paradigm.md) | Ports-and-adapters, functional TypeScript |
| [ADR-001-firestore-cloud-backend](ADR-001-firestore-cloud-backend.md) | Firestore as cloud backend |
| [ADR-002-local-storage-strategy](ADR-002-local-storage-strategy.md) | Local storage strategy |
| [ADR-003-async-sync-port-bridge](ADR-003-async-sync-port-bridge.md) | Async/sync port bridge |
| [ADR-004-bottom-sheet-implementation](ADR-004-bottom-sheet-implementation.md) | Bottom sheet without gesture library |
| [ADR-005-house-area-type-migration](ADR-005-house-area-type-migration.md) | HouseArea as string |
| [ADR-006-section-order-storage-and-sort-override](ADR-006-section-order-storage-and-sort-override.md) | Section order storage and sort override |
| [ADR-007-email-password-auth-migration](ADR-007-email-password-auth-migration.md) | Email/password auth |
| [ADR-008-signout-listener-lifecycle](ADR-008-signout-listener-lifecycle.md) | Sign-out listener lifecycle invariant |
| [product/adr-001-realtime-listener-integration](../product/architecture/adr-001-realtime-listener-integration.md) | Real-time listener integration |
| [product/adr-002-firestore-trip-storage](../product/architecture/adr-002-firestore-trip-storage.md) | Firestore trip storage adapter |
| [product/adr-004-legacy-section-order-wipe-migration](../product/architecture/adr-004-legacy-section-order-wipe-migration.md) | Wipe-on-detect for legacy section orders |
| [product/adr-005-aisle-subgrouping-domain-helper](../product/architecture/adr-005-aisle-subgrouping-domain-helper.md) | Aisle sub-grouping lives in the domain |

## Superseded or stale

| Record | Status |
| --- | --- |
| [ADR-003-email-link-auth](ADR-003-email-link-auth.md) | Superseded by ADR-007-email-password-auth-migration |
| [ADR-002-dedicated-web-app-react-vite](ADR-002-dedicated-web-app-react-vite.md) | Stale: there is no `web/` app; web ships as the Expo web export (`docs/deploy.md`) |
| [product/adr-003-web-email-password-auth](../product/architecture/adr-003-web-email-password-auth.md) | Stale with the separate web app above |
