# Story Map — expo-web-unify

## Backbone

```
Swap deploy target  →  Delete dead code  →  (optional) Lift shared logic to mobile
```

## Walking Skeleton (R1 = MVP)

| Activity | Story | Outcome |
|---|---|---|
| Swap deploy target | **US-01** firebase.json + deploy-web.yml point at Expo web export | push to main publishes real RN UI at grocery-list-cad.web.app |
| Delete dead code | **US-02** `/web/` removed | nobody maintains the dead SPA |

R1 is the shippable atomic unit. Land these two stories together.

## Release 2 (optional salvage)

| Story | Outcome |
|---|---|
| **US-03** Hoist validation + error-mapping to `src/auth/` and refactor mobile LoginScreen to consume them | no inline auth rules on mobile; shared modules ready if any future shared-auth need arises |

R2 is discretionary. Mobile currently works with inline rules in `src/ui/LoginScreen.tsx`. Skip if appetite is low.

## Deferred — NOT in this feature

- Switching off Firebase Hosting to a different provider
- Custom domain
- Service-worker / PWA installability (would be a separate feature)
- Bundle-size optimization (Expo web bundles are bigger than Vite; at single-user scale, irrelevant)
- SEO / SSR (auth-gated single-user app; N/A)

## Dependency graph

```
US-01 (swap target) ─┐
                     ├─→ (R1 ships) ─→ optional US-03
US-02 (delete web) ──┘
```

US-01 and US-02 are siblings — both required for R1. Either first is fine; suggested order in DELIVER: US-01 first (verify Expo web still builds in CI), US-02 second (delete after verifying the replacement works live).
