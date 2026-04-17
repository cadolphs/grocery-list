# Wave Decisions: reorder-home-areas

**Feature ID**: reorder-home-areas
**Wave**: DISCUSS
**Date**: 2026-04-17
**Analyst**: Luna (nw-product-owner)

---

## Feature Intent (verbatim)

> "I want a way to re-order the Home sections in case I change my sweep order routine."

**Clarified scope**: "Home sections" = house areas Carlos walks through during a Home-view sweep (Bathroom, Kitchen Cabinets, Fridge, Freezer, Laundry Room, etc.). **Not** store aisles — that is the separate, already-shipped `store-section-order` feature.

---

## Pre-Set Wave Decisions

### Decision 1: Feature Type — user-facing

Carlos interacts directly with a visible reorder control. Not an infrastructure/technical feature.

### Decision 2: Walking Skeleton — NO (brownfield)

Domain is already complete (`AreaManagement.reorder` exists at `src/domain/area-management.ts:120`). The `useAreas` hook already exposes `reorderAreas` at `src/hooks/useAreas.ts:57-66`. This feature is a pure UI wire-up — there is no skeleton to build; there is an existing skeleton to surface. Every user-visible slice is end-to-end automatically because the backing plumbing already works.

### Decision 3: UX Research Depth — lightweight

- Single persona (Carlos Rivera — already established in `custom-house-areas`)
- One journey (settings gear → reorder → confirm on HomeView)
- Minimal emotional arc (mild anxiety about staple safety → relief on auto-save)
- Happy-path focused, one edge case (persistence across restart/sync)
- No stakeholder matrix, no sensitivity mapping, no persona delta research

### Decision 4: JTBD — SKIP

Job already validated as **JS1 (Home Sweep Capture)** during the `custom-house-areas` feature. Reuse JS1 traceability in all stories. No new JTBD interview, forces analysis, or job map produced for this feature. The reorder capability strengthens an existing job, it does not discover a new one.

---

## Relation to Prior Work

### This feature completes the UI half of US-CHA-06

`custom-house-areas` spec'd **US-CHA-06 "Reorder House Areas"** in `docs/feature/custom-house-areas/discuss/user-stories.md`. The domain layer was built (see `area-management.ts` `reorder` method and full test coverage). The `useAreas` hook exposes `reorderAreas`. **Only the UI control in `AreaSettingsScreen.tsx` was never delivered.** This feature (`reorder-home-areas`) is the UI-delivery slice that ships that last missing piece.

Traceability: every story here carries `@completes-US-CHA-06` annotation so reviewers and downstream waves can connect the dots.

### UI precedent — follow SectionOrderSettingsScreen

The sibling feature `store-section-order` shipped reordering with **up/down button controls** (not drag handles), implemented at `src/ui/SectionOrderSettingsScreen.tsx:76-98`. Its patterns are the template here:

- Up/down arrow buttons per row (not drag-drop — drag on small React Native lists is fragile and the codebase has already made this choice)
- Auto-save on each reorder tap (no explicit Save button)
- Immediate visual feedback (list re-renders instantly)
- No modal or separate "reorder mode"

**Adjustment from the user's original request**: the user wrote "drag and drop" / implied drag in the brief. We match the codebase convention (up/down buttons) because (a) it is the precedent Carlos already uses for aisles, (b) consistency across settings screens reduces cognitive load, (c) the backing `reorderAreas(newOrder)` function is control-agnostic — it accepts the full new order regardless of how the UI produced it, so a future drag upgrade remains possible without domain changes. This choice is documented so DESIGN wave can question it if evidence emerges.

---

## Persona (reused)

**Carlos Rivera** — household grocery shopper. Sweeps his house in a physical walking path. Changed his routine recently (moved the laundry from upstairs to downstairs), so the app order no longer matches his walk. Wants the app to always match his walking path without re-entering every area.

---

## Architecture Constraints (from `docs/product/architecture/brief.md`)

- Hexagonal ports-and-adapters. Domain pure, functional, no classes.
- Hook layer: `useAreas` at `src/hooks/useAreas.ts` — `reorderAreas` already exposed.
- Real-time sync: all area changes propagate via Firestore onSnapshot ≤5s across devices.
- Target platforms: Android + web. React Native + Expo SDK 54.
- Functional paradigm (project CLAUDE.md) — no classes.

---

## Scope Assessment (Elephant Carpaccio)

**PASS — 2 stories, 1 bounded context (UI), estimated 1 day.**

Oversized signals (checking the list):

- [ ] >10 user stories — NO (2 stories)
- [ ] >3 bounded contexts — NO (just `ui/`)
- [ ] Walking skeleton >5 integration points — NO (domain+hook already wired)
- [ ] >2 weeks effort — NO (1 day)
- [ ] Multiple independent user outcomes — NO (one outcome: "Carlos reorders areas to match his walk")

This is a single thin carpaccio slice. See `prioritization.md` for the taste-test reasoning.

---

## SSOT Boundaries

**Do NOT touch `docs/product/`**. The `custom-house-areas` feature already added area-management to the SSOT journey. This feature extends the existing custom-areas journey with a missing UI control — no new SSOT journey entry belongs here for such a small wire-up. If evidence later shows reorder is a distinct user journey worth promoting, that happens when multiple related slices accumulate.

---

## Learning Hypothesis

> "Drag-free reorder in settings (up/down buttons) is sufficient UX for Carlos. He does NOT need in-sweep reorder (reorder from HomeView while mid-sweep)."

**How we validate**: observe usage after 2 weeks — does Carlos ever request "let me reorder without going to settings"? If yes, the next slice adds in-sweep reorder. If not, this feature is done.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Firestore sync conflict: two devices reorder concurrently | Low | Medium | Last-write-wins is acceptable (established sync strategy for `custom-house-areas`). Document as known limitation. |
| Staple-area assignment drift during reorder | None (domain guarantees) | N/A | `reorder()` validates identical set; no area rename/delete happens here |
| User accidentally taps move button | Low | Low | No destructive action — a wrong tap is one additional tap to correct |
| Small-screen layout crowding (up/down buttons + edit + delete per row) | Medium | Low | DESIGN wave handles layout — flag as explicit design constraint |

---

## Handoff Targets

| Downstream Wave | Agent | Artifacts Delivered |
|----------------|-------|---------------------|
| DESIGN | solution-architect | journey YAML + visual + story-map + user-stories + outcome-kpis |
| DISTILL | acceptance-designer | journey.feature + integration points |
| DEVOPS | platform-architect | outcome-kpis for usage-tracking (if applicable) |
