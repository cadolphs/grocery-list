# Walking Skeleton — web-prod-deploy

## Definition

The walking skeleton is the minimum end-to-end publish path: a thin slice that proves every integration point works before adding depth.

For this feature, the skeleton covers three assertions:

1. **Hosting config is declarative and checked in** (US-01) — `firebase.json` + `.firebaserc` at repo root with the right shape.
2. **Deploy workflow file exists with correct gating** (US-02) — `.github/workflows/deploy-web.yml` uses `workflow_run` on CI, branches filter, success conclusion gate, head_sha checkout.
3. **Deploy docs exist** (US-04) — `docs/deploy.md` names the prod URL, trigger, rollback command, and secret rotation.

US-03 (service account secret provisioning) is NOT testable from within the repo — it's a Firebase console + GitHub Settings operation. Documented-only; drill validates via K5 (fresh-checkout deploy).

## Strategy

**C (Real local):** tests use real filesystem I/O on the repo itself. No InMemory doubles, no Firebase CLI invocation, no live deploy.

## Scenarios (see `walking-skeleton.feature`)

1. `firebase.json` declares public dir and SPA rewrite
2. `.firebaserc` maps `default` project to `grocery-list-cad`
3. `deploy-web.yml` chains off CI with correct gating
4. `docs/deploy.md` documents prod URL + rollback + rotation
5. `README.md` links to deploy docs

## Why this is a valid skeleton

- **End-to-end path proven**: a passing skeleton suite means `firebase deploy --only hosting` run locally will succeed (config is valid) AND a push to main will be gated+deployed by CI (workflow is valid) AND future-Clemens will find the runbook (docs exist).
- **Integration checkpoints covered**:
  - repo ↔ firebase CLI: validated by firebase.json shape
  - ci.yml ↔ deploy-web.yml: validated by `workflow_run.workflows == ["CI"]`
  - prod URL ↔ human: validated by docs/deploy.md content
- **No depth yet**: tests do not validate that deploy succeeds in prod (K5 drill does), do not validate that the service account actually works (K5 drill), do not validate that rollback actually rolls back (K3 drill). These are one-shot wall-clock drills, not repeatable jest cases.

## What this skeleton cannot verify

| Gap | Why jest can't verify | How to verify |
|---|---|---|
| Firebase CLI accepts the config | Would require live Firebase API call | Run `firebase deploy --only hosting --dry-run` locally post-DELIVER; document result in `docs/deploy.md` |
| Secret actually authenticates | Would require live service-account use | Observe first green deploy-web.yml run post-DELIVER |
| Rollback works | Requires two deployed releases | K3 drill — run once, record time |
| URL actually serves content | Requires DNS + TLS on live CDN | Browser or `curl -sf https://grocery-list-cad.web.app` post-deploy |

These are intentionally out of jest scope; they belong to the post-DELIVER operational readiness drills (K3, K5) recorded back to `docs/deploy.md`.

## Tags

```
@walking_skeleton @real-io @web-prod-deploy
```

All WS scenarios carry these tags. The feature file tags per-story (`@us-01` etc.) for drill-through.
