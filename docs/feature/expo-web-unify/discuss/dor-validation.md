# Definition of Ready — expo-web-unify

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Business value | ✅ | "Stop maintaining two web apps; ship full mobile UI on web for free." Plain dev productivity gain + future-proofing. |
| 2 | Actor | ✅ | Clemens (solo dev + end user). |
| 3 | ACs testable | ✅ | File-existence + YAML-content + workflow-step checks (same pattern as web-prod-deploy); live-URL content check is a post-push manual drill. |
| 4 | Dependencies | ✅ | Requires feature `web-prod-deploy` (shipped). External: none. |
| 5 | NFRs | ✅ | K1-K7 in outcome-kpis.md. |
| 6 | UX review | N/A | Inherits Expo web UX already proven via `npm run web`. |
| 7 | Technical approach agreed | ✅ | Swap build step + delete /web. Zero architectural complexity. |
| 8 | Sized | ✅ | ~2 h total. US-01 ≈ 30 min, US-02 ≈ 15 min, buffer for post-deploy verification. |
| 9 | Rollback | ✅ | Revert commit OR `firebase hosting:rollback`. Prior Vite release is still on Firebase Hosting until a new one overwrites it (10-release retention). |

No blockers. Peer review optional; for a feature this small and derived, skip per autonomy preference.
