# Feature map

The app has no URL router: every screen renders at `/` and is reached by
tapping. This map lists each screen component (`App.tsx` plus every
`src/ui/*Screen.tsx` and `src/ui/*View.tsx`) with how to seed and reach it.
`npm run control -- map --check` (part of `npm run verify`) fails when a screen
file has no entry or an entry points at a file that no longer exists.

Signed-in screens need a session: `npm run control -- login` with the dedicated
test account (ADR-011). Click targets are React Native `testID`s, which the web
build renders as `data-testid`, so `browse --click <testID>` and
`page.getByTestId()` reach them.

## App root

File: `App.tsx`

Chooses between Loading, Login and the signed-in shell (Home/Store toggle) from
auth state. Reach: `browse --path /`.

## Loading

File: `src/ui/LoadingScreen.tsx`

Shown while auth resolves and services initialize. Seen briefly on every load;
it should not stick. A stuck spinner after `login` means initialization failed:
check `consoleErrors` in `browse --json`.

## Login

File: `src/ui/LoginScreen.tsx`

Signed-out entry point. Reach: `browse --anonymous --path / --contains "Sign In"`.
Actions: email/password sign-in, toggle to sign-up. Never create accounts while
verifying (ADR-011).

## Home view

File: `src/ui/HomeView.tsx`

Default signed-in view: trip items grouped by house area, sweep/checklist modes,
quick add, reset sweep. Reach: `login`, then `browse --path /`. Test IDs:
`home-scroll`, `home-mode-sweep`, `home-mode-checklist`, `reset-sweep-button`,
`settings-button`.

## Area settings

File: `src/ui/AreaSettingsScreen.tsx`

House-area management (add, rename, reorder, delete-and-move). Reach: Home →
`settings-button` (the settings menu renders it inline). Test IDs:
`area-settings-scroll`, `area-name-input`, `add-area-button`.

## Section order settings

File: `src/ui/SectionOrderSettingsScreen.tsx`

Store section ordering. Reach: Home → `settings-button` → "Section Order".
Test IDs: `section-order-settings-scroll`, `confirm-reset-section-order`.

## Store view

File: `src/ui/StoreView.tsx`

Needed items grouped by store section in the saved section order. Reach: Home →
"Store" tab in the view toggle. Seed: mark at least one item needed on Home
first. Test ID: `store-scroll`.

## Trip summary

File: `src/ui/TripSummaryView.tsx`

Shown in the Store view after a trip completes. Seed: a trip with items, then
finish it from the Store view.
