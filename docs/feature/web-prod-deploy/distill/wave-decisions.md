# DISTILL Decisions — web-prod-deploy

## Key Decisions

- **[DWD-01] WS strategy = C (Real local, static-file assertions).** Tests exercise real filesystem I/O on repo config files. No InMemory doubles (no ports to fake). No costly externals invoked (tests do NOT run `firebase deploy`). (see: walking-skeleton.md)
- **[DWD-02] Driving ports = repo filesystem + YAML/JSON parsers.** DESIGN wave was skipped for this feature (documented in DISCUSS+DEVOPS). Driving ports inherited from DEVOPS `ci-cd-pipeline.md` and `environments.yaml`:
  - Filesystem reads of: `firebase.json`, `.firebaserc`, `.github/workflows/deploy-web.yml`, `docs/deploy.md`, `README.md`
  - YAML parser (existing `js-yaml` or native — will use a minimal parser in steps)
  - JSON parser (native `JSON.parse`)
- **[DWD-03] No browser / no live-deploy scenarios.** Tests do NOT launch a browser, do NOT call Firebase CLI, do NOT hit `grocery-list-cad.web.app`. These are out-of-band manual drills (K3, K5). Rationale: running live deploy from tests would couple CI to a prod change every test run. (see: acceptance-review.md)
- **[DWD-04] Mandate 7 scaffolding = file-absence RED, not module-stub RED.** No production modules are imported. Tests assert file existence with `fs.existsSync` / content shape. Missing files → jest `expect().toBe(true)` failure = **RED** (assertion failure, not import error). No `__SCAFFOLD__` markers needed because there are no production source modules. (see: scaffolding notes below)
- **[DWD-05] Tag convention**: `@real-io` (filesystem reads), `@walking_skeleton`, `@us-01`, `@us-02`, `@us-03`, `@us-04`, `@skip` (for milestones not yet unblocked). Per-story tags enable one-at-a-time DELIVER cycles.
- **[DWD-06] No environment matrix parametrization.** `environments.yaml` defines three targets (ci-runner, firebase-hosting-prod, laptop-fallback) but only `ci-runner` is exercisable from jest (we are the repo checkout). `firebase-hosting-prod` and `laptop-fallback` are validated manually post-DELIVER per K3/K5 drills, documented in `docs/deploy.md`.
- **[DWD-07] Error-path scenarios included.** ≥40 % target: red CI blocks deploy, missing secret fails, missing files fail. Covered in walking-skeleton + milestone features.

## Reconciliation result

- Prior-wave files read: 8 of 9 (DESIGN absent by design)
- Contradictions found: **0**
- Soft-gate files missing: `docs/product/kpi-contracts.yaml` (project does not maintain global KPI contracts; feature-local KPIs live in `discuss/outcome-kpis.md`)

## Mandate 7 justification (no source scaffolds)

Standard Mandate 7 creates `src/{module}.py` stubs with `__SCAFFOLD__ = True` so imports succeed but methods raise AssertionError. For this feature:

- **No source modules exist to stub**: the "implementation" is configuration files and a workflow YAML. Nothing imports them.
- **Tests assert file presence and shape**: `expect(fs.existsSync('firebase.json')).toBe(true)` fails with an AssertionError when the file is absent — classified as **RED** (failed expectation) by jest, not BROKEN.
- **No ImportError risk**: tests use Node built-ins (`fs`, `path`) and `js-yaml` (already in devDeps? — if not, falls back to regex parse). Either way, no import from to-be-created production code.

Net: Mandate 7 spirit (RED-not-BROKEN on first run) is preserved without scaffold files. No `__SCAFFOLD__` markers to clean up.

## Container preference

None. No Docker / Docker Compose / testcontainers. Tests run in the existing jest runner inside `ci.yml`.

## Self-review checklist

- [x] WS strategy declared (DWD-01)
- [x] WS scenarios tagged `@real-io @walking_skeleton`
- [x] Every driven adapter has a @real-io scenario (filesystem = only driven adapter)
- [x] InMemory doubles: none used (N/A — documented why)
- [x] Container preference documented (none)
- [x] Mandate 7: no production modules imported → no scaffold files needed (DWD-04)
- [x] Mandate 7: N/A (no `__SCAFFOLD__` markers)
- [x] Mandate 7: N/A (no methods to assert in scaffolds)
- [x] Tests are RED when run against absent config files (verified via `npm test` after DISTILL phase — see acceptance-review.md)
