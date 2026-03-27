# Shared Artifacts Registry — cloud-sync-and-web

## Artifacts

| ID | Description | Source of Truth | Cached? | Synced? |
|----|-------------|-----------------|---------|---------|
| `${staple-library}` | Canonical list of staples (name, area, section) | Cloud | Yes (on-device) | Bidirectional |
| `${section-order}` | User's preferred store section ordering | Cloud | Yes (on-device) | Bidirectional |
| `${area-list}` | Custom house areas | Cloud | Yes (on-device) | Bidirectional |
| `${active-trip}` | Current shopping trip state (items, checkoffs) | Local (on-device) | N/A | Optional / future |

## Sync Direction

- **Web → Cloud → Mobile**: Staple edits made on web propagate to phone
- **Mobile → Cloud → Web**: Quick-add staples on phone propagate to web
- **Conflict resolution**: Last-write-wins (acceptable for single-user scenario)

## Storage Port Mapping

| Artifact | Current Port | Current Adapter |
|----------|-------------|-----------------|
| `${staple-library}` | `StapleStorage` | `async-staple-storage` |
| `${section-order}` | `SectionOrderStorage` | `async-section-order-storage` |
| `${area-list}` | `AreaStorage` | `async-area-storage` |
| `${active-trip}` | `TripStorage` | `async-trip-storage` |

**Key architectural insight**: The ports-and-adapters architecture means cloud sync can be implemented as new adapters for existing ports. The domain logic and UI don't need to change.
