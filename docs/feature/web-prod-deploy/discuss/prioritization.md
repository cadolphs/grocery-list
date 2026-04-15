# Prioritization — web-prod-deploy

## Recommended order

1. **US-01 `firebase.json` + `.firebaserc`** — pure config, no secrets, unblocks local `firebase deploy`, verifiable independently.
2. **US-03 Service account secret + provisioning doc** — blocking for CI; do before wiring the workflow so the first workflow run succeeds.
3. **US-02 `deploy-web.yml`** — depends on both above; first push-to-main after this lands should produce a live deploy.
4. **US-04 `docs/deploy.md`** — written last so URL, commands, and actual workflow naming reflect what shipped (not what was planned).

## Rationale

- US-01 first: cheapest, no external coordination, de-risks deploy config before CI wiring.
- US-03 second: Firebase console + GitHub Settings are separate surfaces; doing it before US-02 avoids a red first run.
- US-02 third: the payoff story — everything converges here.
- US-04 last: docs describe reality, not intent. Write after the first green deploy so the URL and run link are real.

## Single-release decision

All four stories ship in one release ("MVP = publish from main"). No staged rollout — the failure mode of any single story is "prior build stays live", which is acceptable.
