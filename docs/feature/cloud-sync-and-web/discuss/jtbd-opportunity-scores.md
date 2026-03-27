# Jobs-to-be-Done: Opportunity Scores — cloud-sync-and-web

## Scoring

| Job | Importance (1-10) | Current Satisfaction (1-10) | Opportunity Gap | Priority |
|-----|-------------------|-----------------------------|-----------------|----------|
| Comfortable staple editing | 8 | 3 | 5 — strong | Primary motivation |
| Data durability | 6 | 1 | 5 — strong | Side effect of sync |
| Cross-device sync | 7 | 0 | 7 — critical | Foundation/enabler |

## Analysis

- **Sync** scores highest opportunity gap as a critical enabler — without it, neither of the other two jobs can be fulfilled.
- **Comfortable editing** is the primary user motivation driving the entire feature.
- **Data durability** comes essentially free as a side effect of moving to cloud storage.

## Recommended Priority Order

1. **Cloud sync** (foundation layer — enables everything else)
2. **Web UI for staple management** (delivers the primary job)
3. **Data durability** (automatic benefit of #1, may need explicit backup/restore UX later)
