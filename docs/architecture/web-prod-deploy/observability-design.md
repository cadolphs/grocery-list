# Observability Design — web-prod-deploy

**Philosophy**: match observability to operational load. Single-user static web app = minimal observability. Explicit DISCUSS constraint: no Grafana/Datadog/ELK.

## Signals

| Signal | Source | Consumer | Retention |
|---|---|---|---|
| Deploy workflow runs (status, duration, SHA) | GitHub Actions | Clemens via `gh run list` / Actions UI | GitHub default (90 days) |
| Deploy workflow logs (step output, errors) | GitHub Actions | Clemens on incident | 90 days |
| Hosting release history (releases, sizes, timestamps) | Firebase Hosting console | Clemens via Firebase console | Firebase default (unlimited, last 10 releases retained for rollback) |
| Hosting bandwidth / storage usage | Firebase Hosting console → Usage | Clemens monthly glance | 30 days in console |
| Browser-side errors | None instrumented | (deferred — not in scope) | N/A |

## What we are NOT instrumenting (explicit non-goals)

- No structured JSON logs aggregated elsewhere
- No distributed tracing (no multi-service architecture)
- No APM / RUM (React DevTools + browser console suffice for a single user)
- No uptime monitor (Firebase SLA covers this)
- No custom metrics to Prometheus/CloudWatch

Revisit when any of these trigger:
- Second user onboarded
- First reported bug whose root cause is unclear from browser console
- Firebase Hosting outage hits the app

## Health checks

None needed. Firebase Hosting serves static files — there is no long-running process to probe. The URL itself is the health check: if it serves `index.html`, the app is up.

Informal check procedure (documented in `docs/deploy.md`):
```
curl -sf https://grocery-list-cad.web.app > /dev/null && echo OK || echo DOWN
```

## Log aggregation

Not applicable.
- Client: browser console (inspected manually per-device when needed)
- CI/CD: GitHub Actions UI + `gh run view <run-id> --log`
- Hosting: Firebase console

If a future feature introduces Cloud Functions or an API backend, revisit to add structured logging.

## Alerting

See `monitoring-alerting.md`.

## Observability surface summary

```
┌─────────────────────────────────────────────────────┐
│ Clemens's observability toolbox                     │
├─────────────────────────────────────────────────────┤
│ gh run list --workflow=deploy-web.yml     (K1, K2)  │
│ gh run view <id> --log                    (debug)   │
│ Firebase console → Hosting → Releases     (K3 prep) │
│ Firebase console → Hosting → Usage        (K4, cap) │
│ Browser devtools                          (app UX)  │
└─────────────────────────────────────────────────────┘
```

Four surfaces, zero custom infrastructure. Fits single-user operational load.
