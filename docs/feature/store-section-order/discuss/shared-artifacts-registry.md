# Shared Artifacts Registry: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Registry

### section_order

- **Source of truth**: Section order storage (local storage, new port)
- **Consumers**:
  - Store view: section list ordering (replaces default sort when present)
  - Section navigation: "Next" button target selection
  - Store Layout Settings screen: displayed list with drag handles
  - New item creation: auto-append logic for unknown sections
- **Owner**: Section order management feature
- **Integration risk**: HIGH -- section_order drives the entire store view display order. If order is corrupt or missing sections, the store view either shows wrong order or drops sections.
- **Validation**: After any reorder, verify store view section order matches section_order from storage. After any new item with new section, verify new section appears in section_order. After reset, verify default sort is restored.

### known_sections

- **Source of truth**: Derived from all unique (section, aisleNumber) combinations in staple library + current trip items
- **Consumers**:
  - Store Layout Settings: populates the reorder list
  - Section order auto-append: detects sections not yet in custom order
- **Owner**: Derived (no single writer -- computed from staple_library and trip_items)
- **Integration risk**: MEDIUM -- if a section exists in items but not in the settings list, it would be invisible in settings. The auto-append logic mitigates this.
- **Validation**: Every section referenced by any staple or trip item must appear in Store Layout Settings. Count of sections in settings must be >= count of unique sections in items.

### trip_items (existing)

- **Source of truth**: Trip storage (local)
- **Consumers** (new for this feature):
  - Store view: items filtered by section, ordered by section_order
  - Store Layout Settings: sections derived from trip items contribute to known_sections
- **Owner**: Trip management feature (existing)
- **Integration risk**: LOW for this feature -- trip_items is stable; this feature only reads it for section derivation.
- **Validation**: Existing checkpoint (home-to-store item count match) still applies.

### staple_library (existing)

- **Source of truth**: Staple storage (local)
- **Consumers** (new for this feature):
  - Store Layout Settings: sections derived from staples contribute to known_sections
  - Section auto-suggest in MetadataBottomSheet: unchanged
- **Owner**: Item management feature (existing)
- **Integration risk**: LOW for this feature -- read-only access for section derivation.

---

## Integration Checkpoints

### Checkpoint 1: Section Order Consistency

**When**: User reorders sections in Store Layout Settings
**Validate**:
- Store view section order matches section_order from storage
- "Next" button in section detail points to correct next section per custom order
- No section is lost during reorder (count before == count after)

### Checkpoint 2: New Section Auto-Append

**When**: User adds an item with a section name not in section_order
**Validate**:
- New section appears at end of section_order
- New section visible in Store Layout Settings at the bottom
- New section appears in store view if it has items

### Checkpoint 3: Default Fallback

**When**: No custom section_order exists in storage
**Validate**:
- Store view uses default sort: numbered aisles ascending, then named sections alphabetically
- This is identical to current behavior (backward compatible)
- Store Layout Settings shows sections in default order as starting point

### Checkpoint 4: Reset

**When**: User resets custom order to default
**Validate**:
- section_order is cleared from storage
- Store view reverts to default sort
- Store Layout Settings shows default order
- "Next" button navigation reverts to default order

### Checkpoint 5: Persistence

**When**: App restart after custom order set
**Validate**:
- section_order loads from local storage on app start
- Store view shows custom order immediately (no flash of default order)
- Offline-first: no network required
