# Shared Artifacts Registry

**Feature ID**: section-order-by-section

| Artifact | Type | Single Source of Truth | Consumers |
|----------|------|------------------------|-----------|
| `sectionOrder` | `string[] \| null` (section names) | `useSectionOrder` hook (backed by `section-order-storage` port) | `StoreView`, `SectionOrderSettingsScreen` |
| `knownSectionNames` | `string[]` | derived from `stapleLibrary.listAll()` distinct `storeLocation.section` | `SectionOrderSettingsScreen` |
| `SectionGroup` (renamed `AisleGroup`) | `{ section, items[], totalCount, checkedCount }` | `groupByAisle` (or successor) in `item-grouping.ts` | `StoreView` |
| `legacyOrderShape` | predicate `entry.includes('::')` | `useSectionOrder` first-load migration | (internal) |

## Notes

- `aisleNumber` no longer participates in the section group key; it lives only on each `TripItem.storeLocation.aisleNumber` and drives intra-section sort.
- No per-store ordering yet (still global, single-store assumption from `store-section-order`).
