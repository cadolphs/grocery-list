# ADR-001: Firebase Firestore as Cloud Backend

## Status

Accepted

## Context

The grocery list app needs cloud storage to enable cross-device sync (mobile ↔ web) and data durability. The app is a personal/single-user project maintained by a solo developer, with a hard requirement for offline-first mobile operation (store has spotty wifi).

## Decision

Use **Firebase Firestore** as the cloud backend with built-in offline persistence.

## Alternatives Considered

### Supabase (Postgres)
- **Pro**: Open source, full SQL, self-hostable
- **Con**: No built-in offline persistence — must build custom sync layer
- **Rejected because**: Offline-first is the #1 quality attribute. Building a sync layer from scratch adds significant complexity for a single developer.

### PowerSync + Supabase
- **Pro**: Purpose-built offline-first sync with SQLite on device
- **Con**: Two services to manage, newer ecosystem, overkill for single-user
- **Rejected because**: Over-engineered for the use case. Firestore's native offline persistence is sufficient.

### Custom server (Express/Fastify + database)
- **Pro**: Full control
- **Con**: Must host, maintain, build sync protocol
- **Rejected because**: Violates the simplicity constraint. Personal app shouldn't require server maintenance.

## Rationale

1. **Firebase SDK already installed** (^12.8.0 in package.json)
2. **Native offline persistence** — `enablePersistence()` handles offline reads/writes with no custom code
3. **Real-time listeners** — `onSnapshot` provides automatic sync to all connected clients
4. **Free tier** — Spark plan covers single-user usage by orders of magnitude
5. **Web + mobile SDKs** — Same API for both clients
6. **Anonymous auth** — Minimal auth for data scoping, upgradeable later
7. **Firebase Hosting** — Free static hosting for the web app, same project

## Consequences

- **Vendor lock-in**: Data lives on Google Cloud. Migration would require exporting and rebuilding adapters.
- **Query limitations**: Firestore's query model is more limited than SQL. Acceptable for this simple data model.
- **Ports-and-adapters mitigates lock-in**: Domain logic is Firestore-agnostic. Only adapters would need replacement.
