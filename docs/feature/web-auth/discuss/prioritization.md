# Prioritization — web-auth

## Recommended order

1. **US-01 Port `AuthService` to `/web/src/auth/`** — fastest unblock, pure TS + Firebase SDK, no UI. Near-verbatim copy of `src/auth/AuthService.ts`. ~30 min.
2. **US-02 `LoginScreen` with sign-in wired** — the value delivery. Rewriting mobile's React-Native `LoginScreen` as plain React DOM, keeping validation + state-machine logic. After this lands, web app is usable. ~1 h.
3. **US-03 Sign-up mode toggle** — small extension to US-02 (same screen). ~20 min.
4. **US-04 Client-side validation** — copy `validateFormInput` from mobile verbatim, wire up. ~15 min.
5. **US-05 Firebase error mapping** — turn Firebase error codes into actionable copy (nonexistent → hint signup, duplicate → hint signin). ~30 min.
6. **US-06 Loading state** — tiny: button disabled + label swap during `await`. ~15 min.
7. **US-07 Sign Out** — one button + call to `signOut()`. Fits a natural stopping point after US-02. ~15 min. Could ship in R1 if low-hanging.

## Rationale

- US-01 before US-02: UI work needs a port to call.
- US-02 before US-03: the form scaffold is a prerequisite for the toggle.
- US-04/05/06 after R1: they are polish on an already-working path. Don't block basic web access on them.
- US-07 is orthogonal — could move into R1 if Clemens wants explicit sign-out from day one. Cost is low.

## Budget call

If the total budget tightens, the "must ship" subset is **US-01, US-02, US-03**. That gives a working web app with sign-in + sign-up. Error copy stays as Firebase default messages — ugly but functional.

Everything else is strictly nice-to-have.

## Single-slice alternative

Given the total size (~3 h of work across all 7 stories), Clemens could also just ship all 7 in a single delivery. Story map splits are a tool for prioritization, not a mandate. Recommendation: treat R1 + R2 + R3 as one delivery unless something surprises.
