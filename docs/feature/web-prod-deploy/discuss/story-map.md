# Story Map — web-prod-deploy

## Backbone (user activities, left → right)

```
Configure hosting  →  Authenticate CI  →  Automate deploy  →  Document & verify
```

## Walking Skeleton (Release 1 = MVP, only release in scope)

| Activity | Story | Outcome |
|---|---|---|
| Configure hosting | **US-01** `firebase.json` + `.firebaserc` at repo root | `firebase deploy --only hosting` works from any clean checkout |
| Authenticate CI | **US-03** `FIREBASE_SERVICE_ACCOUNT` secret provisioned; procedure documented | CI can auth to Firebase Hosting |
| Automate deploy | **US-02** `.github/workflows/deploy-web.yml` triggers on push to `main` after CI green | Every green main push ships |
| Document & verify | **US-04** `docs/deploy.md` with URL, trigger, rollback, secret rotation | Future-me knows how it works |

## Deferred (explicitly NOT this release)

- Preview channels per PR
- Staging environment
- Custom domain / DNS
- Automated rollback on health-check failure
- Env-var'd Firebase web config (currently hardcoded; client key is public by design)
- Android EAS deploy automation

## Dependency Graph

```
US-01 (firebase.json) ─┐
US-03 (secret)         ├─→ US-02 (workflow) ─→ US-04 (docs)
```

US-01 and US-03 are independent; both must land before US-02 can be green. US-04 closes the loop.
