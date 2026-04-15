# Outcome KPIs — web-auth

Handoff to DEVOPS wave. All KPIs are qualitative or one-shot checks — no ongoing instrumentation needed at this scale.

| ID | KPI | Target | Measurement |
|---|---|---|---|
| K1 | Time from "open app (no session)" to "dashboard visible after entering credentials" | < 10 s on broadband | Stopwatch, one-time validation in K5-style drill |
| K2 | Session persists across tab reload | yes | Manual: reload after sign-in, expect no form |
| K3 | Sign-up → dashboard in < 30 s | yes | Stopwatch, one-time drill (and it's the only new-user experience ever, since Clemens is the only user) |
| K4 | Error messages are actionable (wrong-password, nonexistent-account, duplicate-email) | 100 % | Manual test of each error path; message references the next action |
| K5 | Zero regressions on mobile auth | 100 % | `npm test` (repo jest suite) still passes; no changes to `src/auth/` or `src/ui/LoginScreen.tsx` |
| K6 | Stale email-link code fully removed | yes | `grep -r "sendSignInLinkToEmail\|signInWithEmailLink" web/src/` returns zero hits |

## Assumptions

- Single-user app; no aggregate metrics worth collecting.
- Firebase Auth free tier covers usage (daily active users ≈ 1).
- No analytics instrumentation (no Amplitude, no Firebase Analytics) — out of scope and against project norms.

## What DEVOPS should NOT build for this feature

- Dashboards for sign-in rate, failure rate, session duration
- Email-provider health monitoring (deferred indefinitely)
- Alerting on auth errors
- A/B testing of auth copy

All intentional. KPIs are one-shot manual checks after the feature lands.
