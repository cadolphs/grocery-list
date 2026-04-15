# KPI Instrumentation — web-prod-deploy

Every KPI from `discuss/outcome-kpis.md` has a named data source, collection method, and review cadence. No new infrastructure is built — every KPI piggybacks on existing GitHub or Firebase surfaces.

## K1 — Deploy lead time (push → live), p95 < 300 s

| Aspect | Detail |
|---|---|
| Instrument | GitHub Actions workflow-run metadata (`createdAt` → `updatedAt`) for `deploy-web.yml` |
| Collection | `gh run list --workflow=deploy-web.yml --json createdAt,updatedAt,conclusion --limit 30` |
| Aggregation | jq p95 over last 30 runs (manual, ad-hoc, no cron) |
| Review cadence | Monthly glance, or any time a deploy feels slow |
| Alert threshold | None automated; qualitative |
| Data retention | 90 days (GitHub default) |

Notes: lead time technically starts at `git push`, but the gap between push and workflow_run trigger is ~2-5 s and ignorable at this precision. Tracking CI-triggered duration is the right proxy.

## K2 — Deploy success rate (30-day), ≥ 95 %

| Aspect | Detail |
|---|---|
| Instrument | GitHub Actions workflow-run `conclusion` field |
| Collection | `gh run list --workflow=deploy-web.yml --created ">= $(date -Iseconds -v-30d)" --json conclusion` |
| Aggregation | `conclusion=="success" count / total count` |
| Review cadence | Monthly |
| Alert threshold | GitHub emails on every failure — if email frequency increases, run the query |
| Data retention | 90 days |

## K3 — Rollback wall-clock time, < 120 s

| Aspect | Detail |
|---|---|
| Instrument | Stopwatch during rollback drill |
| Collection | Manual — run `time firebase hosting:rollback` once, verify URL serves prior build |
| Aggregation | Single observation, post-first-deploy |
| Review cadence | One-shot validation drill after US-01+US-02+US-03 land; repeat if Firebase CLI major version changes |
| Alert threshold | N/A |
| Data retention | Recorded in `docs/deploy.md` post-drill |

## K4 — Monthly availability of prod URL, ≥ 99.9 %

| Aspect | Detail |
|---|---|
| Instrument | Firebase Hosting SLA (provider responsibility on free tier) |
| Collection | Firebase status page during any suspected incident |
| Aggregation | Monthly uptime from provider SLA report |
| Review cadence | Only on incident |
| Alert threshold | N/A — Firebase handles |
| External validation | Optional future addition: simple curl cron on personal server pinging the URL every 5 min |

## K5 — Time-to-first-deploy from fresh checkout, < 10 min

| Aspect | Detail |
|---|---|
| Instrument | Stopwatch on fresh clone |
| Collection | Manual — performed once after US-01+US-03 land |
| Aggregation | Single observation |
| Review cadence | One-shot; repeat if `docs/deploy.md` structure changes materially |
| Alert threshold | N/A |
| Success criterion | From `git clone` to live deploy visible, including secret provisioning if needed, < 10 min |

## Summary table

| KPI | Automated? | Data source | Storage | Review |
|---|---|---|---|---|
| K1 lead time | Yes (on-demand query) | GitHub Actions API | GitHub (90 d) | Monthly |
| K2 success rate | Yes (on-demand query) | GitHub Actions API | GitHub (90 d) | Monthly |
| K3 rollback time | No (one-shot drill) | Stopwatch | `docs/deploy.md` | One-shot |
| K4 availability | Provider-owned | Firebase SLA | Firebase | On incident |
| K5 time-to-first | No (one-shot drill) | Stopwatch | `docs/deploy.md` | One-shot |

## What is explicitly NOT built

- No Prometheus scrape endpoint
- No custom GitHub Actions metric exporter
- No synthetic uptime monitor
- No KPI dashboard (no Grafana/Metabase/etc.)
- No auto-alerting on KPI breach

All intentional. See `outcome-kpis.md` "What DEVOPS should NOT build" and constraints in DISCUSS wave-decisions.

## Escalation trigger

Revisit this design and add automated instrumentation if any of:
- User base grows beyond 1
- K2 drops below 95% for two consecutive months
- Firebase Hosting adopts a paid plan for real traffic reasons
- An incident takes > 30 min to diagnose due to missing telemetry
