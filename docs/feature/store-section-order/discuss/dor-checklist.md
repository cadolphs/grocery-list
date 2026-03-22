# Definition of Ready Validation: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## US-SSO-01: Reorder Store Sections

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | Carlos's store walking path does not match aisle-number sort; causes mental translation and backtracking |
| User/persona identified | PASS | Carlos Rivera, bi-weekly shopper at one store, wants sections to match physical walking path |
| 3+ domain examples | PASS | 3 examples: drag Deli before aisles, move Produce to last, rearrange entire list |
| UAT scenarios (3-7) | PASS | 4 scenarios: view sections, drag to new position, auto-save confirmation, persist across restart |
| AC derived from UAT | PASS | 5 criteria derived from scenarios |
| Right-sized | PASS | 1-2 days effort, 4 scenarios, single screen with drag-and-drop |
| Technical notes | PASS | New SectionOrderStorage port, section key derivation, no modification of items |
| Dependencies tracked | PASS | No dependencies (new feature, new port) |
| Outcome KPIs defined | PASS | Setup time under 2 minutes, measured by settings-to-store-view time delta |

### DoR Status: PASSED

---

## US-SSO-02: Store View Uses Custom Section Order

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | Custom order configured but store view still uses default sort; feels broken |
| User/persona identified | PASS | Carlos Rivera, arriving at store, switching to store view |
| 3+ domain examples | PASS | 3 examples: custom order applied, empty sections hidden, no-custom-order fallback |
| UAT scenarios (3-7) | PASS | 4 scenarios: custom order, empty sections, default fallback, home view unaffected |
| AC derived from UAT | PASS | 5 criteria derived from scenarios |
| Right-sized | PASS | 1-2 days effort, 4 scenarios, modifying existing groupBy function |
| Technical notes | PASS | New groupByCustomOrder function or modify existing, pure function, backward compatible |
| Dependencies tracked | PASS | Depends on US-SSO-01 (section order must exist to display) |
| Outcome KPIs defined | PASS | Zero backtracking, measured by re-opens of completed sections |

### DoR Status: PASSED

---

## US-SSO-03: Section Navigation Follows Custom Order

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Next" button points to wrong section (aisle order vs custom order); breaks flow |
| User/persona identified | PASS | Carlos Rivera, in-store, finishing a section, expects "Next" to match his walk |
| 3+ domain examples | PASS | 3 examples: next follows custom, skip empty section, last section no next |
| UAT scenarios (3-7) | PASS | 4 scenarios: next follows order, skip empty, no next at end, section list progress |
| AC derived from UAT | PASS | 5 criteria derived from scenarios |
| Right-sized | PASS | 1 day effort, 4 scenarios, modifying navigation logic only |
| Technical notes | PASS | Navigation consumes same section_order, falls back to default |
| Dependencies tracked | PASS | Depends on US-SSO-02 (store view must use custom order) |
| Outcome KPIs defined | PASS | 80%+ section transitions via "Next" button |

### DoR Status: PASSED

---

## US-SSO-04: New Section Auto-Appends to Custom Order

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | New section from item add could be invisible in store view if not in custom order |
| User/persona identified | PASS | Carlos Rivera, adding whiteboard item with new section name |
| 3+ domain examples | PASS | 3 examples: new section from quick-add, visible in settings, multiple new sections |
| UAT scenarios (3-7) | PASS | 3 scenarios: auto-append, visible in store view, visible in settings |
| AC derived from UAT | PASS | 4 criteria derived from scenarios |
| Right-sized | PASS | 1 day effort, 3 scenarios, hook into item save path |
| Technical notes | PASS | Detection on item save, section key match, auto-persist |
| Dependencies tracked | PASS | Depends on US-SSO-01 (section order storage must exist) |
| Outcome KPIs defined | PASS | Zero items invisible due to missing section in order |

### DoR Status: PASSED

---

## US-SSO-05: Reset Section Order to Default

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | Messy customization or store change; needs quick way to undo all ordering |
| User/persona identified | PASS | Carlos Rivera, dissatisfied with current custom order |
| 3+ domain examples | PASS | 3 examples: reset after mess, cancel accidental reset, reset then re-customize |
| UAT scenarios (3-7) | PASS | 3 scenarios: reset with confirmation, confirm clears, cancel preserves |
| AC derived from UAT | PASS | 5 criteria derived from scenarios |
| Right-sized | PASS | 0.5-1 day effort, 3 scenarios, delete from storage + confirmation dialog |
| Technical notes | PASS | Delete section_order from storage, existing compareAisleGroups takes over |
| Dependencies tracked | PASS | Depends on US-SSO-01 (section order storage must exist to be reset) |
| Outcome KPIs defined | PASS | Reset under 5 seconds |

### DoR Status: PASSED

---

## Summary

| Story | DoR Status | Failed Items |
|-------|------------|-------------|
| US-SSO-01: Reorder Store Sections | PASSED | None |
| US-SSO-02: Store View Uses Custom Section Order | PASSED | None |
| US-SSO-03: Section Navigation Follows Custom Order | PASSED | None |
| US-SSO-04: New Section Auto-Appends to Custom Order | PASSED | None |
| US-SSO-05: Reset Section Order to Default | PASSED | None |

All 5 stories pass the Definition of Ready. Ready for handoff to DESIGN wave.
