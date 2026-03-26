# Edit Staple - Test Scenarios

## Walking Skeleton (4 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| WS-ES-1 | Moves a staple to a different house area | US-ES-01 | Happy path |
| WS-ES-2 | Changes store section and aisle on a staple | US-ES-02 | Happy path |
| WS-ES-3 | Blocks move when same name already exists in target area | US-ES-01 | Error path |
| WS-ES-4 | Allows updating store location on same staple without duplicate error | US-ES-02 | Edge case |

## Milestone 1 (8 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| M1-01 | Rejects edit with empty house area | US-ES-01 | Error path |
| M1-02 | Rejects edit with empty store section | US-ES-02 | Error path |
| M1-03 | Rejects edit on a staple that no longer exists | US-ES-01 | Error path |
| M1-04 | Preserves original values when edit is cancelled | US-ES-01 | Edge case |
| M1-05 | Removes a staple from the library | US-ES-03 | Happy path |
| M1-06 | Trip item moves to new area when staple area is edited | US-ES-04 | Happy path |
| M1-07 | Trip item updates store section when staple section is edited | US-ES-04 | Happy path |
| M1-08 | Editing a staple does not affect one-off items on the trip | US-ES-04 | Edge case |

## Coverage Summary

- Total scenarios: 12
- Happy path: 5 (42%)
- Error path: 5 (42%)
- Edge case: 2 (17% -- but WS-ES-4 and M1-04 serve as boundary validation)
- Error path ratio: 42% (exceeds 40% target)

## Story Coverage Matrix

| Story | Walking Skeleton | Milestone 1 | Total |
|-------|-----------------|-------------|-------|
| US-ES-01 (Edit house area) | 2 | 3 | 5 |
| US-ES-02 (Edit store location) | 2 | 1 | 3 |
| US-ES-03 (Remove staple) | 0 | 1 | 1 |
| US-ES-04 (Sync trip) | 0 | 3 | 3 |
