# DISCUSS Decisions — web-prod-deploy

## Key Decisions

- **[D1] Feature type = Infrastructure.** Pure deploy/hosting wiring; no UI or domain change. (see: plan file, story-map.md)
- **[D2] No walking skeleton.** Web SPA already exists and builds; scope is publish-path wiring only. (see: story-map.md)
- **[D3] Lightweight UX depth.** Single actor (Clemens), single journey, trivial emotional arc. No personas, no multi-persona edge cases. (see: journey-publish-web-visual.md)
- **[D4] JTBD analysis skipped.** Motivation self-evident: avoid manual deploy friction for solo dev on two devices. Would be re-doing the plan-file context in "situation/motivation/outcome" template. (see: plan file)
- **[D5] Hosting provider = Firebase Hosting.** Inherited from `docs/feature/cloud-sync-and-web/design/technology-stack.md`; not re-litigated. (see: technology-stack.md)
- **[D6] Deploy trigger = push to `main` after CI green.** Not `workflow_dispatch`, not tag-based. Matches single-branch solo-dev workflow. (see: US-02)
- **[D7] Auth = GitHub Actions service-account secret `FIREBASE_SERVICE_ACCOUNT`.** Not OIDC (more setup for no gain at this scale). (see: US-03)
- **[D8] Scope bounds strict.** No preview channels, no staging, no custom domain, no auto-rollback. Explicit in story-map "Deferred" list.

## Requirements Summary

- **Primary need**: A push to `main` produces a live production web build at `https://grocery-list-cad.web.app` within 5 minutes, with no manual intervention and a one-command rollback.
- **Walking skeleton scope**: Entire feature IS the skeleton — 4 stories, one release.
- **Feature type**: Infrastructure.

## Constraints Established

- Single-user app — availability and throughput requirements are trivial.
- Firebase project `grocery-list-cad` already in use for Firestore + Auth; reuse for Hosting.
- Web build already wired (`cd web && npm run build`); workflow must call this as-is.
- Existing `ci.yml` must remain the quality gate; deploy workflow gates on it, doesn't duplicate it.

## Upstream Changes

None. DISCOVER was not run for this feature (infra-only, fast track). Architecture brief line 204 ("web static bundle") is satisfied but not contradicted by this feature — it is elaborated, not changed.

## Handoff

- **To**: nw-platform-architect (DEVOPS wave)
- **Primary artifacts**: `user-stories.md`, `story-map.md`, `outcome-kpis.md`
- **DESIGN wave**: likely skippable for this feature (no app-layer design change). Platform architect to confirm.
