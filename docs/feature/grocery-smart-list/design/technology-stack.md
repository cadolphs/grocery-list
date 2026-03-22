# Technology Stack: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Stack Summary

All technologies are already in the project or are OSS additions. No new proprietary dependencies.

---

## Runtime

| Technology | Version | License | Purpose | Rationale |
|-----------|---------|---------|---------|-----------|
| React Native | 0.81.5 | MIT | Mobile UI framework | Existing -- walking skeleton built on this |
| Expo SDK | 54 | MIT | Development/build toolchain | Existing -- EAS Build configured |
| TypeScript | 5.9.x | Apache 2.0 | Type-safe development | Existing -- strict mode enabled |
| React | 19.1.0 | MIT | Component model and hooks | Existing -- functional components throughout |

## Storage

| Technology | Version | License | Purpose | Rationale |
|-----------|---------|---------|---------|-----------|
| @react-native-async-storage/async-storage | 2.2.x | MIT | Local key-value persistence | Existing dependency. Simple, offline-first, no setup. Sufficient for < 1000 items. |

### Alternatives Considered for Storage

| Alternative | Evaluated | Rejected Because |
|------------|-----------|-----------------|
| expo-sqlite | Yes | Adds SQL complexity for a dataset of < 100 staples and < 50 trip items. AsyncStorage JSON serialization is simpler and sufficient. Would reconsider if item count exceeds 1000 or complex queries needed. |
| WatermelonDB | Yes | Designed for sync-heavy apps with thousands of records. Over-engineered for single-user, local-only, < 100 item dataset. MIT license but heavy dependency. |
| MMKV (react-native-mmkv) | Yes | Faster than AsyncStorage but requires native module (no Expo Go support without dev client). Adds build complexity. AsyncStorage performance is sufficient for this dataset size. Would reconsider if storage latency becomes measurable. |

## Testing

| Technology | Version | License | Purpose | Rationale |
|-----------|---------|---------|---------|-----------|
| Jest | 29.7.x | MIT | Test runner | Existing -- configured with jest-expo preset |
| jest-expo | 54.x | MIT | Expo-aware Jest preset | Existing |
| @testing-library/react-native | 13.3.x | MIT | Component testing | Existing -- behavioral testing approach |

## Build and Deploy

| Technology | Version | License | Purpose | Rationale |
|-----------|---------|---------|---------|-----------|
| EAS Build | N/A (cloud service) | Expo Terms | Build service | Existing -- profiles configured (development, preview, production) |
| EAS CLI | Latest | MIT | Build/submit CLI | Existing |

## Architecture Enforcement (New)

| Technology | Version | License | Purpose | Rationale |
|-----------|---------|---------|---------|-----------|
| dependency-cruiser | Latest | MIT | Enforce dependency rules | Prevents domain from importing infrastructure. Runs in CI. JSON config, integrates with existing Jest/npm scripts. |

### Alternatives Considered for Architecture Enforcement

| Alternative | Evaluated | Rejected Because |
|------------|-----------|-----------------|
| ArchUnitTS | Yes | Less mature than dependency-cruiser, smaller community. dependency-cruiser has broader adoption and better documentation. |
| ESLint import rules | Yes | Can restrict some imports but cannot express layered dependency rules or detect cycles as comprehensively. |

## Dependencies NOT Added

| Technology | Why Not |
|-----------|---------|
| State management library (Redux, Zustand, MobX) | React hooks + context sufficient for this app's complexity. Single user, no concurrent state mutations, small state tree. Reconsider if state logic grows beyond 3-4 hooks. |
| Navigation library (React Navigation) | Walking skeleton has no navigation yet. Will be needed when multi-screen flow is built, but that is a crafter decision during implementation. Architecture does not prescribe navigation choice. |
| Cloud sync (Firebase Firestore, Supabase) | Out of scope. Local-only in initial releases. |

---

## Total New Dependencies

| Dependency | Type | Added For |
|-----------|------|----------|
| dependency-cruiser | devDependency | Architecture enforcement in CI |

One new dev dependency. Zero new runtime dependencies. The entire feature is built on the existing stack.
