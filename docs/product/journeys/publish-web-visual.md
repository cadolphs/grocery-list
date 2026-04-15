# Journey: Publish Web (SSOT)

Solo-dev devops journey. Single actor: Clemens.

```
push main ──► ci.yml (green) ──► deploy-web.yml: build /web ──► firebase deploy ──► live at grocery-list-cad.web.app
     │             │ red → stop              │ red → stop              │ red → manual fallback from laptop
     │                                                                  │
     └──────────────── bad code → `firebase hosting:rollback` (<2 min) ─┘
```

**Goal**: trigger = `git push`; result = live prod in <5 min; failure = prior build keeps serving.

**Source of truth for shared artifacts**: `docs/feature/web-prod-deploy/discuss/shared-artifacts-registry.md`.

**Features realizing this journey**:
- `web-prod-deploy` — initial wiring (firebase.json, deploy workflow, service account, docs).

Future extensions (not yet scoped): preview channels per PR, staging env, custom domain, auto-rollback on health check.
