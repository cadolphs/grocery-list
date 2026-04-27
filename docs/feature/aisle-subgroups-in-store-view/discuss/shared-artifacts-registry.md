# Shared Artifacts Registry

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27

| Artifact | Source of truth | Consumed by |
|----------|-----------------|-------------|
| `TripItem.storeLocation.aisleNumber: number \| null` | `src/domain/types.ts` (existing) | partition helper, `AisleSection` |
| `SectionGroup` | `src/domain/item-grouping.ts::groupBySection` (existing) | `partitionByAisle` (new), `AisleSection` |
| `AisleSubGroup` (new) | new helper in `src/domain/item-grouping.ts` | `AisleSection` |
| Section ordering | `src/hooks/useSectionOrder.ts` + `src/domain/section-ordering.ts` (existing) | StoreView (unchanged) |
| Aisle visual treatment (divider + badge) | new style block in `AisleSection.tsx` | StoreView render path |

No new persistence. No schema migration. No port surface change.
