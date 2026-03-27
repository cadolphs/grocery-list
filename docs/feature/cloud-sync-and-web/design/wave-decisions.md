# DESIGN Decisions — cloud-sync-and-web

## Key Decisions
- [D1] Cloud backend: Firebase Firestore — already installed, native offline persistence, free tier, no server to manage (see: ADR-001)
- [D2] Web app: Dedicated React + Vite app in `web/` directory — desktop-optimized, not Expo Web (see: ADR-002)
- [D3] Auth: Email link (passwordless) — same email = same UID across devices, solves cross-device identity (see: ADR-003)
- [D4] Adapter strategy: New Firestore adapters implement existing storage ports — domain/UI unchanged (see: component-boundaries.md)
- [D5] Data model: Single documents per data category under `users/{uid}/data/` — simple, maps to existing ports (see: data-models.md)
- [D6] Conflict resolution: Last-write-wins at document level via Firestore server timestamps
- [D7] Shared types: Copy domain types to web app initially; evaluate monorepo if drift becomes a problem
- [D8] Hosting: Firebase Hosting for web app — free, same project as Firestore

## Architecture Summary
- Pattern: Ports-and-adapters (existing, extended with Firestore adapters)
- Paradigm: Functional (existing, unchanged)
- Key components: Firestore adapters (mobile), React+Vite web app, Firebase project (Firestore + Auth + Hosting)

## Technology Stack
- Mobile: Existing Expo/React Native + Firebase SDK (already installed)
- Web: React + Vite + Firebase SDK
- Backend: Firebase Firestore (free Spark plan)
- Auth: Firebase Email Link Auth
- Hosting: Firebase Hosting

## Constraints Established
- Firestore offline persistence handles offline-first requirement natively
- Single documents (not subcollections) — data sets are small enough
- No custom sync protocol — Firestore SDK manages sync queue
- Email link auth required for cross-device identity (was initially anonymous, revised)
- Walking skeleton includes auth setup (not deferred)

## Upstream Changes
- [U1] Auth approach changed from anonymous to email link — DISCUSS artifacts assumed "no login UI needed" (requirements.md NFR-4). Email link requires a simple sign-in screen on both mobile and web. This is a minor UX addition, not a scope change.
- [U2] Walking skeleton scope should include email link auth setup — not just cloud backend + read-only web view. Auth is a prerequisite for data scoping.
