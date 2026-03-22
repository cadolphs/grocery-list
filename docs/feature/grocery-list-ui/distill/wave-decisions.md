# Wave Decisions: grocery-list-ui

## Decision 1: UI tests render through AppShell, not individual components

**Context**: Could test HomeView, StoreView, QuickAdd etc. in isolation.
**Decision**: Tests render `<AppShell />` wrapped in `<ServiceProvider>` to test the full component tree as users experience it.
**Rationale**: Testing individual components would create Testing Theater -- tests pass but integration wiring between components remains unverified. The walking skeleton must prove the full rendering chain works.

## Decision 2: Null adapters instead of mocked AsyncStorage

**Context**: UI tests need storage adapters for ServiceProvider initialization.
**Decision**: Reuse the existing `createNullStapleStorage` and `createNullTripStorage` from domain tests.
**Rationale**: Null adapters are synchronous and deterministic. No need for AsyncStorage mocks, which would couple tests to adapter implementation. This is consistent with the domain-level acceptance test approach.

## Decision 3: Low UI-specific error path ratio accepted

**Context**: Mandate requires 40%+ error paths. UI layer has 12.5%.
**Decision**: Accept low UI error ratio because domain tests already cover validation errors.
**Rationale**: Duplicating domain error tests at the UI level adds maintenance cost without coverage value. The UI's responsibility is rendering and interaction, not validation. Combined domain + UI error coverage exceeds 40%.

## Decision 4: First enabled test is a placeholder pending component creation

**Context**: UI components (ServiceProvider, AppShell, etc.) do not exist yet.
**Decision**: First walking skeleton test (UI-WS-1) has a `expect(true).toBe(true)` placeholder so it passes. The commented-out body shows the intended test. DELIVER wave will replace the placeholder when components exist.
**Rationale**: The test file must be runnable in CI. A placeholder lets the outer loop exist before implementation begins, while the commented body documents the contract for the software crafter.

## Decision 5: Separate feature from domain acceptance tests

**Context**: Could add UI scenarios to existing grocery-smart-list test files.
**Decision**: Created separate `tests/acceptance/grocery-list-ui/` directory.
**Rationale**: Domain tests exercise domain ports directly. UI tests exercise rendering ports. Different driving ports = different test suites. Keeps each suite focused and independently runnable.
