# Outcome KPIs: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Objective

Make adding new items with full metadata feel as fast as adding items without metadata, so Carlos actually classifies items instead of skipping classification.

---

## Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| MK1 | Carlos (grocery planner) | Adds new items with complete metadata (type + area + section) | 80% of new items have full metadata | 0% (current QuickAdd hardcodes defaults) | Count of items with non-default metadata / total new items added | Leading |
| MK2 | Carlos | Adds a new item with metadata in under 10 seconds | Average metadata entry under 10 seconds | N/A (no metadata entry exists) | Time from "Add as new item" tap to "Add Item" confirmation | Leading |
| MK3 | Carlos | Experiences zero misclassified items per trip | 0 items needing reclassification | N/A (all items get hardcoded defaults) | Count of items Carlos would need to edit post-add (proxy: items in "Uncategorized" section) | Leading |

---

## Metric Hierarchy

### North Star
**MK1: Metadata completion rate > 80%** -- If Carlos does not fill in metadata, the feature has failed. The whole point is that new items get proper classification.

### Leading Indicators
- MK2 (add time under 10 seconds) -- predicts MK1 because if metadata entry is too slow, Carlos will skip it
- K4 from grocery-smart-list (overall add time under 10 seconds) -- must NOT degrade; metadata entry is an addition to the existing add flow

### Guardrail Metrics
- **K4 (add time under 10 seconds)** -- metadata entry must not push total add time over 10 seconds. If it does, the feature is net-negative.
- **Overall add rate** -- Carlos should not add fewer items per trip because metadata entry is discouraging. Monitor total items added per trip.

---

## Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| MK1 | Trip item data | Count items where section != "Uncategorized" and section != "Unknown" / total new items | Per trip | App (automated) |
| MK2 | Bottom sheet interaction | Timestamp: "Add as new item" tap to "Add Item" tap | Per item add | App (automated) |
| MK3 | Trip item data | Count items in "Uncategorized" section at trip completion | Per trip | App (automated) |
| K4 (guardrail) | QuickAdd interaction | Timestamp: input focus to item confirmed (existing measurement) | Per item add | App (automated) |

---

## Hypothesis

We believe that adding a **metadata bottom sheet with smart defaults and section auto-suggest** to the QuickAdd flow for **Carlos Rivera (household grocery planner)** will achieve **80%+ metadata completion rate while keeping add time under 10 seconds**.

We will know this is true when **Carlos adds new items with full metadata (MK1 > 80%)** in **under 10 seconds (MK2 < 10s)** with **zero items needing reclassification (MK3 = 0)** over **4 consecutive shopping trips**.

---

## Per-Story KPI Mapping

| Story | Primary KPI | How It Contributes |
|-------|-------------|-------------------|
| US-AIF-01: Add new item via bottom sheet | MK1 | Enables metadata entry at all (core flow) |
| US-AIF-02: Context-aware smart defaults | MK2, K4 | Pre-filled defaults reduce entry time |
| US-AIF-03: Skip metadata shortcut | K4 | Preserves speed for rushed users (guardrail) |
| US-AIF-04: Section auto-suggest | MK1, MK2 | Reduces typing, improves section consistency |
| US-AIF-05: Duplicate staple detection | MK3 | Prevents accidental duplicates |
| US-AIF-06: Add existing staple to trip | MK3 | Recovery path from duplicate detection |
