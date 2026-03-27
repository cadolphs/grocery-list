# User Story Map — cloud-sync-and-web

## Backbone (User Activities)

| Set Up Cloud | Manage Staples (Web) | Manage Sections (Web) | Shop at Store (Mobile) |
|-------------|---------------------|----------------------|----------------------|

## Walking Skeleton (Minimum E2E Slice)

Proves the sync architecture works end-to-end. Read-only on web, offline-first on mobile.

| Activity | Story |
|----------|-------|
| Set Up Cloud | Connect mobile app to cloud backend; migrate local data to cloud |
| Manage Staples | View staple library on web (read-only) |
| Shop at Store | Mobile app loads staples from cloud with offline-first caching |

**Delivers**: Data durability (Job 2) + sync proof-of-concept (Job 3 foundation)

## Slice 2: Web Editing + Bidirectional Sync

Delivers the primary job: comfortable staple management on the web.

| Activity | Story |
|----------|-------|
| Manage Staples | Add staple on web |
| Manage Staples | Edit staple on web |
| Manage Staples | Delete staple on web |
| Manage Sections | View sections organized on web |
| Shop at Store | Quick-add staple on mobile syncs back to cloud |

**Delivers**: Comfortable staple management (Job 1) + full bidirectional sync (Job 3)

## Slice 3: Full Management (Future)

Polish and power-user features.

| Activity | Story |
|----------|-------|
| Manage Staples | Bulk add/edit staples on web |
| Manage Sections | Reorder sections on web |
| Manage Sections | Add/rename house areas on web |

**Delivers**: Productivity improvements for heavy management sessions

## Dependencies

```
Walking Skeleton ──→ Slice 2 ──→ Slice 3
     │
     └── Cloud backend selection & setup (prerequisite for everything)
```
