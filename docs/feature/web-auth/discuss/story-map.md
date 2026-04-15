# Story Map — web-auth

## Backbone

```
Put up a sign-in screen  →  Wire sign-in + sign-up  →  Handle errors  →  Sign out
```

## Walking Skeleton = Release 1 (MVP — ships usable web app)

| Activity | Story | Outcome |
|---|---|---|
| Put up a sign-in screen | **US-01** Replace stale `useAuth` with email/password `AuthService` port in `/web/src/auth/` | Sign-in/sign-up functions available; stale email-link code removed |
| Wire sign-in | **US-02** Build `LoginScreen` component with email + password fields + Sign In button; wire to `AuthService.signIn` | Returning user can sign in; dashboard appears |
| Wire sign-up | **US-03** Add mode toggle + sign-up branch; wire to `AuthService.signUp` | New user can sign up from the same screen |

After R1 ships, Clemens can use the web app for real. All other items are polish.

## Release 2 (error handling)

| Story | Outcome |
|---|---|
| **US-04** Client-side validation (empty email, email format, password min 8 chars on sign-up) + actionable copy | Users don't fire pointless network requests |
| **US-05** Firebase error mapping: wrong password, nonexistent account, email already in use | Users get a clear next step instead of raw Firebase codes |
| **US-06** Loading state: button disabled + label change ("Signing In...") during request | Prevents double-submit, sets expectation |

## Release 3 (sign out)

| Story | Outcome |
|---|---|
| **US-07** Sign Out button in dashboard header + `AuthService.signOut()` | Clemens can explicitly end the session (also useful for troubleshooting) |

## Deferred — NOT in this feature

- Forgot-password / password reset flow
- Password-strength meter beyond 8-char min
- OAuth / Google / social sign-in
- Multi-factor auth
- Session-timeout UX
- CSS / visual polish (own feature: `web-ux-polish` already exists for the dashboard side; auth screen polish would extend it)
- "Remember me" toggle (default local persistence covers the single-user case)

## Dependency graph

```
US-01 (AuthService port) ─┬─→ US-02 (sign-in form)
                          └─→ US-03 (sign-up mode) ── depends on US-02 for screen scaffold
                                                       ↓
US-02 + US-03 ──→ US-04 (client validation) ──→ US-05 (error mapping)
                                                       ↓
                                              US-06 (loading state)
                                                       ↓
                                              US-07 (sign out)
```

US-01 unblocks everything. US-02 is the walking-skeleton critical path. US-03 piggybacks on the same screen. Releases 2 and 3 are stackable; any subset can ship.
