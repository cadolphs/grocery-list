# Outcome KPIs: Section-Keyed Ordering

**Feature ID**: section-order-by-section

## KPI 1: Section Cards Match Section Diversity (Store View)

- **Metric**: `count(distinct section cards in store view) == count(distinct section names on trip)`
- **Target**: equality on every trip
- **Method**: assertion in `StoreView` integration tests; manual visual check on dogfood trip
- **Baseline**: today equals `count(distinct (section, aisle) pairs)`, often higher
- **Owner**: Carlos (single user) verifies on next trip after Slice 01

## KPI 2: Settings Rows Match Section Diversity

- **Metric**: `count(rows in SectionOrderSettingsScreen) == count(distinct section names in staple library)`
- **Target**: equality after Slice 02 ships
- **Method**: component test snapshot + manual count
- **Baseline**: today rows = distinct (section, aisle) pairs in staple library

## KPI 3: Reorder Time

- **Metric**: time from opening settings to committing a 5-section reorder
- **Target**: <30 seconds
- **Method**: Carlos times himself once after Slice 02
- **Baseline**: today's composite-row screen — Carlos confused about what aisle-N rows mean

## KPI 4: Zero Garbage on Upgrade

- **Metric**: count of rendered rows containing `::` after first launch on new build
- **Target**: 0
- **Method**: manual inspection on first launch post-deploy
- **Baseline**: would be N/A (legacy build did not have this risk)
