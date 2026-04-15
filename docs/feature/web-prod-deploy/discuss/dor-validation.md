# Definition of Ready — web-prod-deploy

All 9 items validated with evidence. Ready to hand off to DEVOPS (nw-platform-architect).

| # | DoR item | Status | Evidence |
|---|---|---|---|
| 1 | Business value articulated | ✅ | Context in plan + journey-visual: eliminate manual deploy, stable URL reachable from any device. Single user = value is productivity + muscle-memory preservation. |
| 2 | User / actor identified | ✅ | Clemens (solo dev + end user). Documented in journey-publish-web.yaml `actor: clemens`. |
| 3 | Acceptance criteria testable | ✅ | Every AC in user-stories.md is either (a) a filesystem assertion, (b) an HTTP GET assertion, or (c) a GitHub Actions run assertion. All concrete. |
| 4 | Dependencies identified | ✅ | Dependency graph in story-map.md. External: Firebase project `grocery-list-cad` already exists; service account to be created (US-03). |
| 5 | Non-functional requirements defined | ✅ | outcome-kpis.md: lead time, success rate, rollback time, availability — all with numeric targets. |
| 6 | UX / UI reviewed | N/A → ✅ | Infrastructure feature, no UI. Journey emotional arc reviewed (trivial by design). |
| 7 | Technical approach agreed | ✅ | Firebase Hosting pre-selected in `docs/feature/cloud-sync-and-web/design/technology-stack.md`. No re-litigation. Workflow approach (FirebaseExtended/action-hosting-deploy@v0) named in US-02. |
| 8 | Estimable / sized | ✅ | 4 stories, each <1 day for solo dev. US-01 and US-04 are config/docs only. US-02 is one workflow file. US-03 is one console trip + one doc section. |
| 9 | Rollback / risk plan | ✅ | `firebase hosting:rollback` (AC in US-04). Prior build stays live on any failure. Manual laptop fallback documented. Service account least-privilege. |

## Outstanding concerns

None blocking.

## Peer review

Intended reviewer: nw-product-owner-reviewer. When invoked, reviewer should verify:
- All ACs are testable without ambiguity
- KPIs measurable with named instrument
- No story spans >1 day for solo dev
- JTBD skip justified (single-user, motivation self-evident)

Review can be run via `/nw-review` after this wave completes; not a blocker to DEVOPS handoff for this feature given its scope.
