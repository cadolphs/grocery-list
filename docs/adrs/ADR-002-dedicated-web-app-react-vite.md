# ADR-002: Dedicated React + Vite Web App

## Status

Accepted

## Context

The user needs a desktop-optimized web interface for staple management. The existing app is built with Expo/React Native and supports `npm run web` via react-native-web.

## Decision

Build a **separate React + Vite web app** in the `web/` directory, rather than using Expo Web.

## Alternatives Considered

### Expo Web (react-native-web)
- **Pro**: Zero additional code — existing app runs in browser
- **Con**: Mobile-first UI on desktop feels awkward. Cannot optimize for keyboard/mouse. Limited desktop UX control.
- **Rejected because**: The primary job is *comfortable desktop management*. A mobile UI stretched to fill a browser window doesn't deliver that.

### Next.js
- **Pro**: Full-featured React framework, SSR, routing
- **Con**: Overkill for a single-page staple manager. More config, larger bundle, unnecessary complexity.
- **Rejected because**: Violates simplicity constraint. No need for SSR, routing, or server-side features.

### Plain HTML + vanilla JS
- **Pro**: Zero build step, maximum simplicity
- **Con**: No TypeScript, no component model, harder to maintain as UI grows
- **Rejected because**: Loses type safety. Cannot share domain types with mobile app.

## Rationale

1. **React consistency** — Same component model as mobile app. Shared mental model.
2. **Vite speed** — Sub-second HMR, fast builds, minimal config
3. **TypeScript** — Shares domain types with mobile app
4. **Desktop-first** — Can use tables, keyboard shortcuts, full-width layouts
5. **Lightweight** — No framework overhead, <200KB bundle
6. **Firebase Hosting** — Deploy with `firebase deploy`, free

## Consequences

- **Separate codebase**: Web app is independent. No shared React components with mobile (different renderers).
- **Type duplication risk**: Domain types must be copied or shared via monorepo structure.
- **Two apps to maintain**: Additional maintenance burden, mitigated by the web app's intentional simplicity.
