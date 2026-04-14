# DISCUSS Wave Decisions: web-ux-polish

## Context

Brownfield feature to replace mobile-first interaction patterns with desktop-web-appropriate
equivalents. The mobile (iOS/Android) app remains the primary shopping tool; desktop web is
used for trip planning (managing staples, library, areas).

## Pre-Wave Decisions (from parent request)

| Decision | Value |
|----------|-------|
| Feature type | User-facing |
| Walking skeleton | No (brownfield — existing components) |
| UX research depth | Lightweight |
| JTBD | Skipped — job is clear ("work efficiently on desktop web") |
| Platform scope | Desktop web only (mobile retains long-press) |
| Detection method | `Platform.OS === 'web'` |

## DISCUSS-Wave Decisions

### D1: Edit affordance on web = visible pencil icon per row

**Options considered:**

- Visible edit icon (pencil) per row — selected
- Right-click context menu — rejected: unfamiliar to many users, invisible affordance, some
  browsers block it
- Hover-to-reveal controls — rejected: breaks touch-capable laptops, violates Norman's
  signifier principle (affordance invisible at rest)
- Three-dot kebab menu — rejected: extra click, more appropriate for multi-action rows; we
  only need "edit"

**Rationale:** Visible pencil icon is an explicit signifier (Norman), works on all web input
modalities (mouse, keyboard, touch laptop), is unambiguous, does not require hover state,
and is a web-native pattern (cf. Gmail, Notion, Linear row actions).

**Scope:** Icon renders only when `Platform.OS === 'web'`. iOS/Android retain long-press as
the edit affordance — no regression.

### D2: Keyboard-first flow on web

Desktop planning sessions involve adding 5-20 staples in a row. The mouse-dominant flow
(type → click "Add" → fill sheet → click "Add Item" → refocus input) breaks rhythm. Pure
keyboard flow is the target: type → Enter → fill fields → Enter → focus returns → next item.

### D3: Platform-conditional behavior (no mobile regression)

All new behavior is gated behind `Platform.OS === 'web'`. Native apps retain existing
long-press-to-edit and tap-to-add-button flows. This is a critical guardrail — stories
carrying web behavior must include a native-regression scenario.

### D4: No new components; minimal visual change

The largest visible change is the pencil icon. All other improvements (Enter-key submit,
autofocus, focus restoration) are invisible at rest. No design-system rework needed.

### D5: Outcome KPI approach — time-to-add

The North-Star KPI is "time to add 10 staples on desktop web" (wall-clock). Baseline is
measured before rollout; target is at least 40% reduction. Secondary KPIs: % of staple-add
actions completed without mouse use (keyboard-only sessions), and edit-action discoverability
on web (edit events / user / session).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing DIVERGE artifacts — no validated job statement | Medium | Low | Scope is narrow, pre-validated by user request; job is clearly stated |
| React Native Web may not propagate keyboard events consistently on all `TextInput` variants | Medium | Medium | Manual verification in DESIGN wave; acceptance test in Playwright during DELIVER |
| Pencil icon on every row adds visual density | Low | Low | Lightweight icon, consistent with established web patterns |
| Focus management regressions (focus lost after sheet close) | Medium | Medium | Explicit AC for focus restoration, test at component level |
| Changes touch `TripItemRow`, `StapleChecklist`, `QuickAdd`, `MetadataBottomSheet` — 4 components | Low | Medium | Stories scoped to single component where possible |

## Out of Scope

- Bulk-paste add (e.g., paste a newline-separated list) — flagged as future story
- Right-click context menus anywhere in the app
- Desktop-specific layout (multi-column, sidebars) — separate feature
- Drag-and-drop reordering on web
- Mobile UX polish (tracked separately)
