---
name: control-grocery-list
description:
  Run and check the real grocery-list app (Expo web) with the control CLI. Use
  for every check of the running app and for the Testing proof in a PR.
---

# control-grocery-list

Use the CLI for every check of the running app. Local first; production only
for `health`. Add `--json` to any command for machine-readable output.

```sh
npm run control -- doctor                       # env check, prints the fix for each failure
npm run control -- dev                          # start or reuse Expo web on http://localhost:8081
npm run control -- browse --anonymous --contains "Sign In"     # signed-out proof
npm run control -- login                        # test-account session (needs env, below)
npm run control -- browse --path / --click settings-button --contains "Section Order" --record
npm run control -- execute --code-file .control/fixtures/add-item.mjs --record
npm run control -- map store                    # how to seed and reach a screen
npm run control -- map --check                  # feature map vs src/ui (in verify)
npm run control -- health --sha <merge-sha>     # production serves that commit
npm run control -- dev --stop
```

Artifacts (screenshots, `--record` videos, sessions, `dev.log`) go to
`.control/`, which git ignores.

## Seed user

There is no emulator or staging project: the app talks to production Firebase.
Sign in **only** the dedicated test account the maintainer provides through
`CONTROL_EMAIL` and `CONTROL_PASSWORD` in your environment (or in a gitignored
`.env` at the repo root, which `npm run control` loads). Never create
accounts, never touch another account's data, never use the Firebase CLI or
console (ADR-011). Without those variables, prove signed-out flows and rely on
jest for the rest; say so under **Testing**.

## Fixtures for `execute`

The app has no HTTP API of its own, so `execute` drives the UI. A fixture
default-exports an async function that gets Playwright's `page` and the
`origin`, and throws to fail:

```js
// .control/fixtures/add-item.mjs (scratch; commit only reusable fixtures)
export default async ({ page }) => {
  await page.getByTestId('home-scroll').waitFor();
  // ...interact via getByTestId / getByText, assert, return a summary
  return { ok: true };
};
```

React Native `testID`s render as `data-testid` on web. Screen test IDs are in
[docs/feature-map.md](../../../docs/feature-map.md).

## Proof

1. Add or update the jest test that covers the change; `npm run verify`.
2. `doctor`, then `dev`.
3. UI change: `browse ... --contains <text> --record` (or `execute` for a
   multi-step flow) with the data this change needs.
4. Native-only change (iOS/Android): the web build cannot prove it; say so and
   rely on jest + manual check by the maintainer.
5. After merge: `health --sha <merge-sha>` (the ship loop's deploy check runs
   it).

Cite the exact commands and results under **Testing** in the PR.
