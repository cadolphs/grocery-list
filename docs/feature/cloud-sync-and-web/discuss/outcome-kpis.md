# Outcome KPIs — cloud-sync-and-web

## Primary KPIs

### KPI-1: Web Management Adoption
**Metric**: Percentage of staple add/edit/delete operations done via web vs. mobile
**Target**: > 50% of staple management operations happen on web after Slice 2
**Measurement**: Compare operation counts by client type (web vs. mobile)
**Job**: Job 1 (Comfortable Staple Management)

### KPI-2: Sync Reliability
**Metric**: Percentage of changes that successfully sync within 5 minutes of connectivity
**Target**: > 99%
**Measurement**: Track sync queue depth and completion timestamps
**Job**: Job 3 (Cross-Device Sync)

### KPI-3: Data Durability
**Metric**: Zero data loss events
**Target**: 0 reported data loss incidents
**Measurement**: User-reported + automated consistency checks
**Job**: Job 2 (Data Durability)

## Secondary KPIs

### KPI-4: Offline Resilience
**Metric**: App usability during connectivity loss at store
**Target**: 100% of shopping flows work offline (no errors, no stalls)
**Measurement**: No network-dependent blocking calls in shopping path

### KPI-5: Sync Latency (Perception)
**Metric**: Time from edit on one device to visibility on the other
**Target**: < 30 seconds when both devices have connectivity
**Measurement**: Timestamp comparison of write and read events

## Validation Approach
Since this is a personal app, KPIs are validated through the developer's own usage rather than analytics infrastructure. A simple log or manual observation after 2 weeks of use is sufficient.
