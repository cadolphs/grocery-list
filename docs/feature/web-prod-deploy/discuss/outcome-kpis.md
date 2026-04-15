# Outcome KPIs — web-prod-deploy

Handoff artifact for DEVOPS (nw-platform-architect). Each KPI has a numeric target and a named measurement source.

| ID | KPI | Target | Measurement source | Instrument |
|---|---|---|---|---|
| K1 | Deploy lead time (push → live) | p95 < 300 s | GitHub Actions run duration for `deploy-web.yml` | Query Actions API `runs/{id}.timing` or simple manual check |
| K2 | Deploy success rate (30-day) | ≥ 95 % | GitHub Actions run status on `deploy-web.yml` over trailing 30 days | `gh run list --workflow=deploy-web.yml --created >=30d ago` + count conclusion=success |
| K3 | Rollback wall-clock time | < 120 s | `firebase hosting:rollback` invocation to URL serving prior build | Stopwatch during drill; observed once post-first-deploy |
| K4 | Monthly availability of prod URL | ≥ 99.9 % | Firebase Hosting SLA (free tier) | Firebase console → Hosting → usage; externally verifiable via uptime ping if needed later |
| K5 | Time-to-first-deploy from fresh checkout | < 10 min | Stopwatch, one-time manual | Executed once after US-01+US-03 land to validate doc completeness |

## Assumptions and bounds

- Single-user traffic — availability ≥ 99.9 % is Firebase's default, no extra engineering.
- No formal SLO dashboard required; `gh run list` + Firebase console sufficient.
- K3 and K5 are one-time validation KPIs (drill + bootstrap check), not continuous.

## What DEVOPS should *not* build for this feature

- Dedicated observability stack (Grafana/Datadog)
- Synthetic uptime monitor
- Auto-rollback on health-check failure
- Deploy approval gate

Revisit these only if multi-user traffic or SLA expectations change.
