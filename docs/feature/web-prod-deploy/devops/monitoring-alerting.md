# Monitoring & Alerting — web-prod-deploy

## Alerting philosophy

- Built-in GitHub + Firebase email notifications cover the only incidents that matter at this scale.
- No PagerDuty / Opsgenie / Slack bot — single user, no on-call rotation.
- Prefer discoverability (next time Clemens opens the Actions tab) over push alerting for non-urgent signals.

## Alerts

| Alert | Source | Channel | Severity | Action |
|---|---|---|---|---|
| Deploy workflow failed | GitHub Actions built-in | Email to Clemens (GitHub notification default) | P2 — non-urgent (prior build still live) | Open run, read log, fix and re-push or rerun |
| CI workflow failed on `main` | GitHub Actions built-in | Email | P2 | Fix and re-push |
| Firebase Hosting free-tier quota exceeded | Firebase console → Alerts | Email (to be configured by Clemens one-time) | P1 — site will 429 if hit (impossible at single-user scale) | Upgrade to Blaze plan; investigate egress anomaly |
| Security audit high finding on push | `npm audit` in ci.yml (today `|| true` — warning not blocking) | Log only | P3 | Triage weekly |

## SLOs / SLIs

| SLI | Target (SLO) | Measurement window | Error budget policy |
|---|---|---|---|
| Deploy success rate (K2) | 95% | trailing 30 days | If under: investigate; most likely cause is Firebase auth or flaky action version — repin |
| Deploy lead time p95 (K1) | 300 s | trailing 30 days | If over: investigate runner cache state or bundle bloat |
| Prod URL availability (K4) | 99.9%/month | calendar month | Firebase SLA; not our budget to spend |

No SLO dashboard is built. Monthly mental check via `gh run list` is the review cadence.

## Dashboard spec (minimal)

Not a dashboard — a shell alias. Documented in `docs/deploy.md`:

```bash
# Quick health check: last 10 deploy runs
gh run list --workflow=deploy-web.yml --limit 10

# Workflow durations (K1 spot-check)
gh run list --workflow=deploy-web.yml --json createdAt,updatedAt,conclusion --limit 30 \
  | jq -r '.[] | "\(.conclusion)\t\(.createdAt)\t\(.updatedAt)"'
```

## Incident response (abbreviated runbook)

| Symptom | First action |
|---|---|
| Site won't load | `curl -I https://grocery-list-cad.web.app` → check Firebase status page → `firebase hosting:rollback` if caused by recent deploy |
| Deploy workflow red | Open Actions UI → read last step log → most likely: auth (rotate secret), build (fix source), firebase CLI version drift (bump action version) |
| "Something looks wrong" on phone | Open browser console → check network tab → cross-reference against last deploy run |

Full runbook lives in `docs/deploy.md`.
