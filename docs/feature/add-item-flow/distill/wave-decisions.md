# Wave Decisions: Add Item Metadata Flow (DISTILL)

**Feature ID**: add-item-flow
**Wave**: DISTILL
**Date**: 2026-03-19

---

## Decision 1: Domain-First Walking Skeleton

**Context**: The add-item-flow feature is entirely UI-focused (new component + modifications to existing components). No new domain logic, ports, or adapters. The walking skeleton could start at the UI level or domain level.

**Decision**: Start walking skeleton WS-AIF-1 at the domain level (staple library search returning no match). UI-level walking skeletons (WS-AIF-2 through WS-AIF-4) will be enabled when the MetadataBottomSheet component is created.

**Rationale**: The domain search behavior already exists and is testable. Starting here provides an immediately passing first test that validates the prerequisite condition (no match triggers the prompt). The DELIVER wave crafter can use this as the starting point for the outer loop.

---

## Decision 2: Section Auto-Suggest Tests at Domain Level

**Context**: Section auto-suggest derives distinct sections from `stapleLibrary.listAll()` and filters by prefix. The architecture design places this derivation in the UI layer. We could test it at the UI level only, or also validate the domain data availability.

**Decision**: Test the data availability (distinct sections from listAll) at the domain level in the focused scenarios, and test the UI filtering behavior at the UI level when the component exists.

**Rationale**: The domain already provides listAll(). Verifying that distinct sections can be derived from it confirms the data contract. The prefix-match filtering is a pure function that can be tested independently.

---

## Decision 3: Duplicate Detection Uses Existing Domain Logic

**Context**: US-AIF-05 requires duplicate detection. The staple-library already has isDuplicate logic (checked in addStaple). We could test duplicate detection as a separate concern or rely on the existing addStaple error path.

**Decision**: Duplicate detection scenarios test through the existing addStaple result (success: false, error message). The UI-level duplicate warning state is tested at the component level.

**Rationale**: No new domain logic needed. The existing `addStaple` already returns descriptive errors for duplicates. The MetadataBottomSheet intercepts this by calling `onFindDuplicate` before submitting, which the UI tests will validate.

---

## Decision 4: Error Path Coverage Strategy

**Context**: The feature has multiple validation and error paths (missing area, missing section, duplicates, dismiss without action). Target is 40%+ error/edge scenarios.

**Decision**: 12 of 26 scenarios (46%) cover error paths, edge cases, and recovery journeys. This includes validation errors (area required, section required), duplicate detection with recovery, skip fallback behavior, and dismiss-without-action.

**Rationale**: The bottom sheet is a form with multiple paths. Each validation rule and each recovery option gets a dedicated scenario. This ensures the DELIVER wave crafter implements all paths, not just the happy path.
