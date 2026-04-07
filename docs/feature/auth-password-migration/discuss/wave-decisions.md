# Wave Decisions: auth-password-migration

## DISCUSS Wave Context

- **Feature type**: Cross-cutting (auth spans UI + services)
- **Walking skeleton**: No (brownfield -- service layer already exists)
- **UX research depth**: Lightweight (happy path focus, standard auth pattern)
- **JTBD**: No (motivation is clear -- Firebase Dynamic Links deprecation)
- **Prior waves**: No DISCOVER wave -- reactive migration driven by external deprecation

## Key Decisions Made

### 1. Single screen with mode toggle (not separate Sign In / Sign Up screens)

**Rationale**: The current LoginScreen is a single component. Keeping one screen with a mode toggle minimizes navigation complexity and matches the existing architecture. Two separate screens would add routing overhead for no user benefit.

### 2. Four stories, not two

**Rationale**: Could have been 2 stories (add password auth + remove email-link). Split into 4 for right-sizing: sign in, sign up, mode toggle, and cleanup are each independently demonstrable and testable. This allows parallel work and incremental delivery.

### 3. Cleanup as separate story (US-04), not bundled

**Rationale**: Cleanup (removing email-link code) has different risk profile and dependencies than adding new auth UI. Separating it allows the new auth to ship and be verified before old code is removed. Avoids "big bang" swap.

### 4. Password minimum 8 characters (not Firebase's 6)

**Rationale**: Firebase allows 6-character passwords, but the existing NullAuthService validates >= 8. Keeping consistent >= 8 across real and null implementations avoids test/production divergence. 8 is also a more widely accepted minimum.

### 5. AuthService interface changes deferred to DESIGN wave

**Rationale**: Whether to remove sendSignInLink/handleSignInLink from the AuthService interface is an architectural decision. The DISCUSS wave specifies that the UI should not call these methods; whether the interface itself is pruned is a DESIGN concern.

### 6. Deep link handling scope deferred to DESIGN wave

**Rationale**: The useDeepLinkHandler in App.tsx currently only handles auth. If the app needs deep linking for other features in the future, the handler should be scoped rather than removed. This is an architectural decision.

## Deferred to DESIGN Wave

- AuthService interface pruning (remove email-link methods or keep for backward compat?)
- Deep link handler: remove entirely or scope to non-auth links?
- Password reset flow (not in scope for this migration but may be needed)
- Migration path for existing email-link-only users (may need password reset or re-registration)

## Handoff Package

### For solution-architect (DESIGN wave)

| Artifact | Path |
|----------|------|
| Journey visual | `docs/feature/auth-password-migration/discuss/journey-auth-login-visual.md` |
| Journey schema | `docs/feature/auth-password-migration/discuss/journey-auth-login.yaml` |
| Gherkin scenarios | `docs/feature/auth-password-migration/discuss/journey-auth-login.feature` |
| Story map | `docs/feature/auth-password-migration/discuss/story-map.md` |
| Prioritization | `docs/feature/auth-password-migration/discuss/prioritization.md` |
| Requirements | `docs/feature/auth-password-migration/discuss/requirements.md` |
| User stories | `docs/feature/auth-password-migration/discuss/user-stories.md` |
| Acceptance criteria | `docs/feature/auth-password-migration/discuss/acceptance-criteria.md` |
| Outcome KPIs | `docs/feature/auth-password-migration/discuss/outcome-kpis.md` |
| Shared artifacts | `docs/feature/auth-password-migration/discuss/shared-artifacts-registry.md` |
| DoR checklist | `docs/feature/auth-password-migration/discuss/dor-checklist.md` |

### For acceptance-designer (DISTILL wave)

| Artifact | Path |
|----------|------|
| Journey schema | `docs/feature/auth-password-migration/discuss/journey-auth-login.yaml` |
| Gherkin scenarios | `docs/feature/auth-password-migration/discuss/journey-auth-login.feature` |
| Shared artifacts | `docs/feature/auth-password-migration/discuss/shared-artifacts-registry.md` |
| Outcome KPIs | `docs/feature/auth-password-migration/discuss/outcome-kpis.md` |
