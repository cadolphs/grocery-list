# Outcome KPIs — expo-web-unify

One-shot manual verification. No ongoing instrumentation.

| ID | KPI | Target | Measurement |
|---|---|---|---|
| K1 | Prod URL serves the Expo web bundle | yes | Open `https://grocery-list-cad.web.app` post-deploy; verify full RN UI renders (staples table, nav, etc.) — not the Vite stripped-down form |
| K2 | Sign-in with existing credentials still works on the new bundle | yes | Manual: sign in with the mobile credentials; expect dashboard |
| K3 | Session persists across reload (unchanged from web-prod-deploy K2) | yes | Reload tab post-sign-in; expect dashboard |
| K4 | `/web/` directory is absent post-migration | true | `test ! -d web && echo OK` |
| K5 | Zero references to deleted `/web/` in production code | true | `grep -r "web/src\|web/package\|web/dist" --include='*.ts' --include='*.tsx' --include='*.yml' --include='*.json' --exclude-dir=docs --exclude-dir=node_modules .` returns empty |
| K6 | Deploy pipeline duration stays under K1 of web-prod-deploy (< 300 s p95) | yes | GitHub Actions run timing. Expo export is slower than Vite build but still well under budget; observe post-deploy |
| K7 | Main-repo jest suite still 567+ passing | yes | CI green on first push after the change |

## What DEVOPS should NOT build for this feature

Same as `web-prod-deploy`: no dashboards, no synthetic uptime, no auto-rollback. Free tier + one-user = informal checks suffice.

## Rollback if things go sideways

- Revert the migration commit(s).
- OR: `firebase hosting:rollback` — restores the prior Vite-based release. That release is still self-contained in Firebase Hosting's release history.
