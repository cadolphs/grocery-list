# Prioritization — cloud-sync-and-web

## Priority Order (Outcome-Based)

### Priority 1: Walking Skeleton
**Outcome**: Prove cloud sync architecture works E2E
**Stories**: Cloud setup + read-only web view + offline-first mobile loading
**JTBD**: Enables Job 2 (data durability), foundation for Job 1 and Job 3
**Risk reduction**: Validates backend choice, sync mechanism, and offline-first approach before investing in full web UI
**Estimated complexity**: High (new infrastructure, new adapter implementations, web app scaffold)

### Priority 2: Web Editing + Bidirectional Sync
**Outcome**: Deliver the primary job — comfortable staple management
**Stories**: CRUD staples on web + section viewing + mobile quick-add syncs back
**JTBD**: Delivers Job 1 (comfortable editing) and completes Job 3 (full bidirectional sync)
**Estimated complexity**: Medium (web UI work, bidirectional sync, conflict resolution)

### Priority 3: Full Management (Future)
**Outcome**: Power-user polish
**Stories**: Bulk operations, section reordering, area management on web
**JTBD**: Enhances Job 1 comfort for heavy management sessions
**Estimated complexity**: Low-Medium (UI work, existing patterns)

## Key Decision Point

After Walking Skeleton: evaluate whether the chosen backend technology works well enough before investing in Slice 2. This is the natural "pivot or proceed" gate.
