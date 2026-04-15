# Journey: Web Sign-In (SSOT)

Single-actor auth journey for the web companion app. Mirrors mobile's existing email/password flow (delivered 2026-04-10 via `auth-password-migration`).

```
open app (no session) ──► sign-in screen ──► submit ──► Firebase Auth ──► dashboard
                           │ toggle                            │ fail
                           ▼                                   ▼
                        sign-up screen                     error shown, retry
                           │ submit
                           ▼
                    Firebase createUser ──► dashboard

(reload with active session) ──► dashboard  (bypasses form)
(click Sign Out)              ──► sign-in screen
```

**Relationship to other journeys**:
- Follows `publish-web` (web app must be live at `grocery-list-cad.web.app` for this journey to start).
- Mobile has an analogous journey implemented in `src/ui/LoginScreen.tsx` (feature `auth-password-migration`, evolution doc `2026-04-10-auth-password-migration.md`). Same Firebase Auth account usable on both.

**Features realizing this journey**:
- `web-auth` — initial wiring (port AuthService, build LoginScreen, handle errors, sign out).

**Future extensions** (not scoped):
- Forgot-password / password reset
- OAuth / Google sign-in
- MFA
- Visual polish (fold into `web-ux-polish` or a new `web-auth-polish`)
