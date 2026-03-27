# Journey: Staple Management Across Devices — cloud-sync-and-web

## Overview
Primary journey: managing staples comfortably on the web, shopping on the phone, with bidirectional sync.

## Personas
- **User**: Solo household member who manages grocery staples and shops. Technical (developer). Uses laptop at home, phone at store.

## Journey Map (Happy Path)

```
Phase 1: MANAGE (Home/Laptop)          Phase 2: SHOP (Store/Phone)
================================        ================================

1. Open web app in browser              5. Open mobile app
   → See staple library                    → App syncs latest from cloud
   Emotion: Ready to organize              Emotion: Confident data is current

2. Browse staples by area/section       6. Start shopping trip
   → Full-screen table/list view           → Staples auto-loaded
   Emotion: Clear overview                 Emotion: Effortless

3. Add/edit/reorganize staples          7. Check items off while shopping
   → Keyboard input, quick actions         → Normal mobile flow
   Emotion: Productive, fast               Emotion: Focused

4. Changes auto-save to cloud           8. Discover new item at store
   → No manual save button                 → Quick-add as new staple
   Emotion: Trust                          → Syncs to cloud
                                           Emotion: Seamless

                    ←── cloud sync ──→

                                        9. Later on web: new staple visible
                                           Emotion: Everything just works
```

## Key Design Decisions
- Web app is **dedicated** (not Expo Web reuse) — purpose-built for desktop staple management
- Phone remains first-class for ad-hoc staple additions (mixed usage pattern)
- Sync is **bidirectional**: web → cloud → phone AND phone → cloud → web
- Auto-save (no manual save button) — changes persist immediately

## Critical Constraint: Offline-First Mobile
The store has **spotty wifi**. The mobile app MUST be offline-first:
- All data cached locally; no blocking network calls during shopping
- Sync is **gradual and eventual** — opportunistic background sync when connectivity allows
- The app must never stall, error, or lose data due to poor connectivity

## Error Paths (Lightweight)
- **Spotty wifi at store**: App works entirely from local cache. Syncs in background when packets get through. No user-visible errors.
- **Offline on phone at store**: Must work offline. Sync when back online.
- **Sync conflict**: Same staple edited on both devices. Last-write-wins is acceptable for a single-user app.
- **Cloud unavailable**: Mobile app must degrade gracefully to local-only mode (existing behavior).

## Shared Artifacts
- `${staple-library}`: The canonical list of staples, areas, and sections — lives in cloud, cached locally
- `${section-order}`: User's preferred section ordering — synced alongside staples
- `${area-list}`: Custom house areas — synced alongside staples
- `${active-trip}`: Current shopping trip — primarily on-device, sync optional
