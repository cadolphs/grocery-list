# Journey Delta: Section-Keyed Ordering

**Refines**: `docs/feature/store-section-order/discuss/journey-store-layout.yaml`

## Mental Model Shift

| Before | After |
|--------|-------|
| Carlos thinks each aisle-card is a separate orderable thing | Carlos thinks each named section is the orderable unit |
| `Inner Aisles` appears as 3 rows when spanning 3 aisles | `Inner Aisles` is one row, one block |
| Aisle number is part of the order key | Aisle number is sub-order inside a section |

## Happy Path (Delta)

1. **Open settings** — Carlos opens `Store Section Order`. Sees one row per section.
2. **Reorder** — Carlos drags `Produce` to top. Single move; affects all `Produce` aisles.
3. **Save** (auto) — Order persists.
4. **Open store view** — Trip renders one card per section; items within `Inner Aisles` ordered aisle 4 → 5 → 7.
5. **Add new aisle** — Carlos saves a staple at `Inner Aisles@12`. Settings row count unchanged. Store view now shows aisle 12 inside the `Inner Aisles` card.
6. **Add new section** — Carlos saves a one-off at `Sushi Bar`. Settings list gains one new row at the end. Carlos may drag it where he likes.

## Emotional Arc

- Step 1: relief (clean list, no aisle clutter).
- Step 2: confidence (one drag, whole block moves).
- Step 4: validation (store view matches mental model).
- Step 5: trust (no surprise rows).
- Step 6: ownership (Carlos extends the order without friction).

## Error Paths

- **Legacy storage** → migration wipe handles it; fallback to alphabetical sort, no broken rows.
- **All sections null aisle** → no intra-section sort needed; render in insertion order or by name.

## Shared Artifacts (Delta)

| Artifact | Source | Consumers |
|----------|--------|-----------|
| `sectionOrder: string[]` (section names) | `useSectionOrder` | `StoreView`, `SectionOrderSettingsScreen` |
| `knownSectionNames: string[]` | `stapleLibrary.listAll()` → distinct `storeLocation.section` | `SectionOrderSettingsScreen` for derived list |
| `AisleGroup` (renamed candidate: `SectionGroup`) | `groupByAisle` over trip items | `StoreView` rendering |

## Out of Scope

- New journey for in-store navigation; out of scope per US discussion.
