# Prioritization: Section-Keyed Ordering

## Order

1. **Slice 01** (US-04 + US-02) — Migration + store-view grouping.
   - Rationale: highest learning leverage. Domain refactor with mutation-test exposure. Migration must precede settings rework or settings will read garbage. Dogfoodable: Carlos's daily trips reveal grouping correctness immediately.
2. **Slice 02** (US-01 + US-03) — Settings UI + auto-append narrowing.
   - Rationale: settings rework only makes sense once domain layer is section-keyed. Auto-append depends on section-name keys.

## Outcome Impact

| Slice | KPI moved | Why |
|-------|-----------|-----|
| 01 | Section cards = distinct section names | Direct: changes grouping output |
| 02 | Settings rows = distinct section names | Direct: changes settings render source |
