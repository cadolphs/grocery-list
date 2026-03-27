# Requirements — cloud-sync-and-web

## Functional Requirements

### FR-1: Cloud Storage Backend
The system must store staple library, area list, and section order in a cloud database accessible from both mobile and web clients.

### FR-2: Offline-First Mobile
The mobile app must cache all data locally and operate fully without network connectivity. Sync must be gradual and eventual — no blocking network calls during shopping. Store has spotty wifi.

### FR-3: Web Staple Management
A dedicated web application must allow viewing, adding, editing, and deleting staples with a desktop-optimized UI (keyboard input, full-screen layout).

### FR-4: Bidirectional Sync
Changes made on the web must propagate to mobile, and changes made on mobile (e.g., quick-add staple) must propagate to web. Sync must be eventual and non-blocking.

### FR-5: Data Migration
Existing on-device data (staples, areas, section order) must be migrated to the cloud backend without data loss.

### FR-6: Graceful Degradation
If the cloud backend is unavailable, the mobile app must continue working with locally cached data (preserving current behavior).

## Non-Functional Requirements

### NFR-1: Latency
Web UI interactions must feel instant (optimistic updates). Mobile app startup must not be blocked by sync.

### NFR-2: Conflict Resolution
Last-write-wins is acceptable for single-user scenario. Conflicts must not cause data loss or corruption.

### NFR-3: Cost
Backend should be free or near-free for a single-user personal app. No ongoing server costs if possible (serverless/BaaS preferred).

### NFR-4: Privacy
Grocery data is low-sensitivity but should not be publicly accessible. Basic authentication required.

### NFR-5: Simplicity
Minimize infrastructure complexity. Prefer managed services over self-hosted. The user is a single developer maintaining a personal app.

## Constraints

- **Offline-first is non-negotiable**: Store has spotty wifi. App must never stall during shopping.
- **Existing architecture**: Ports-and-adapters. Cloud sync should be implemented as new storage adapters, not a rewrite.
- **Single user for now**: No multi-user auth/permissions needed. Sharing is out of scope.
- **Expo SDK 54 / React Native**: Mobile app technology is fixed.
- **Web app is separate**: Dedicated web app, not Expo Web reuse.

## Out of Scope
- Multi-user sharing / household collaboration
- Trip sync across devices (trips are local to the shopping phone)
- Real-time collaborative editing
- Push notifications
