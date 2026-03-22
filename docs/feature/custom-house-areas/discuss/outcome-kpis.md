# Outcome KPIs: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## KPI-CHA-01: Area Customization Adoption

- **Who**: All active users
- **Does what**: Customizes at least one area (add, rename, delete, or reorder) within first week
- **By how much**: 50% of active users make at least 1 area change
- **Measured by**: Count of users who performed any area CRUD operation / total active users
- **Baseline**: 0% (feature does not exist)
- **Target date**: 2 weeks after release

## KPI-CHA-02: Area Addition Rate

- **Who**: Users with non-default house layouts
- **Does what**: Adds at least 1 custom area
- **By how much**: 60% of users who open area settings add at least 1 area
- **Measured by**: Count of "Add Area" saves / count of settings screen opens
- **Baseline**: 0 (feature does not exist)
- **Target date**: 4 weeks after release

## KPI-CHA-03: Default Area Cleanup

- **Who**: Users whose homes do not match the 5 defaults
- **Does what**: Removes at least 1 irrelevant default area
- **By how much**: 40% of users who customize areas delete at least 1
- **Measured by**: Count of delete events / count of users who made any area change
- **Baseline**: 0 (feature does not exist)
- **Target date**: 4 weeks after release

## KPI-CHA-04: Sweep Completion with Custom Areas

- **Who**: Users who customized their areas
- **Does what**: Completes sweeps with 100% area coverage (all custom areas visited)
- **By how much**: 90% of sweeps cover all areas (same or better than with defaults)
- **Measured by**: Sweeps where all areas completed / total sweeps (for customized users)
- **Baseline**: Current sweep completion rate with 5 default areas
- **Target date**: 4 weeks after release

## KPI-CHA-05: Zero Data Loss on Area Operations

- **Who**: All users performing rename or delete operations
- **Does what**: Experiences zero orphaned staples (staples with no valid area)
- **By how much**: 0 orphaned staples across all users
- **Measured by**: Count of staples whose houseArea does not match any configured area
- **Baseline**: 0 (all staples currently match hardcoded areas)
- **Target date**: Ongoing

---

## Measurement Notes

- KPI-CHA-05 (data integrity) is the most critical: any non-zero value indicates a propagation bug
- KPIs CHA-01 through CHA-03 measure adoption and can be tracked via simple event logging
- KPI-CHA-04 validates that customization does not harm the core sweep experience
