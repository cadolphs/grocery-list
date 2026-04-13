# Outcome KPIs — wire-firestore-trip-sync

## KPI-1: Trip Checkoff Sync Latency

- **Who**: Multi-device grocery shoppers
- **Does what**: See trip checkoffs appear on the other device without restart
- **Target**: 100% of checkoffs visible within 5 seconds
- **Baseline**: 0% (trips use AsyncStorage, no cross-device sync)
- **Measurement**: Check off item on device A, observe on device B, measure delay

## KPI-2: Zero Data Loss on Wiring Change

- **Who**: Existing users with active trips
- **Does what**: Retain all trip state after the production wiring change
- **Target**: 0 items lost, 0 checkoff states lost
- **Baseline**: N/A (one-time change)
- **Measurement**: Compare trip state before and after deployment (migration already handled by correct-sync-behavior US-06)

## KPI-3: No Regression in App Startup Time

- **Who**: All authenticated users
- **Does what**: App initializes without noticeable delay increase
- **Target**: < 500ms additional startup time from trip listener setup
- **Baseline**: Current startup time with AsyncStorage trip storage
- **Measurement**: Time from auth to isReady=true in development builds
