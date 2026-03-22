# ADR-005: HouseArea Type Migration (Union to String)

## Status

Proposed

## Context

The Grocery Smart List app defines house areas as a TypeScript union type:

```
type HouseArea = 'Bathroom' | 'Garage Pantry' | 'Kitchen Cabinets' | 'Fridge' | 'Freezer'
```

This type is used across the entire codebase: domain types (`StapleItem`, `TripItem`, `AddStapleRequest`, `AddTripItemRequest`), domain logic (`groupByArea`, `getSweepProgress`), ports (`StapleStorage`, `TripStorage`), and UI components (`MetadataBottomSheet`, `HomeView`).

The custom-house-areas feature requires areas to be user-configurable -- added, renamed, deleted, and reordered. A union type cannot represent dynamic values. The type system must change to support runtime-defined area names.

Three hardcoded area constants exist:
- `ALL_HOUSE_AREAS` in `src/domain/item-grouping.ts`
- `ALL_HOUSE_AREAS` in `src/domain/trip.ts`
- `HOUSE_AREAS` in `src/ui/MetadataBottomSheet.tsx`

## Decision

Change `HouseArea` from a union type to `string`. Remove all hardcoded area constants. Introduce runtime validation via a pure function.

Specifically:
1. `type HouseArea = string` in `types.ts` (or remove the alias and use `string` directly)
2. Delete `ALL_HOUSE_AREAS` constants from `item-grouping.ts` and `trip.ts`
3. Delete `HOUSE_AREAS` constant from `MetadataBottomSheet.tsx`
4. `groupByArea` receives the area list as a parameter
5. Trip service receives the area list at creation time
6. MetadataBottomSheet receives the area list as a prop
7. Area name validation enforced by `validateAreaName` pure function at creation/rename time

## Alternatives Considered

### Alternative 1: Branded String Type

```
type HouseArea = string & { readonly __brand: 'HouseArea' }
```

**Evaluation**:
- (+) Preserves type distinction between arbitrary strings and validated area names
- (+) Prevents accidental assignment of non-validated strings
- (-) Requires a constructor function at every site where a HouseArea value is created
- (-) All test files that create items with area strings must use the constructor
- (-) JSON deserialization from AsyncStorage produces plain strings -- every load site needs branding
- (-) The validation function already guards the creation boundary; branding adds ceremony without adding safety beyond what validation provides

**Rejected because**: The branding overhead is substantial (construction sites in tests, deserialization, adapters) and the safety benefit is minimal when a validation function already guards the two entry points (add area, rename area). Every other use of HouseArea is a read from storage that was already validated at write time.

### Alternative 2: Keep Union Type with Code Generation

Generate the union type from the stored area list at build time or app start.

**Evaluation**:
- (+) Preserves compile-time safety for area values
- (-) Union types are compile-time constructs; cannot be generated at runtime
- (-) Build-time generation requires a code generation step that reads storage -- fundamentally incompatible with runtime-configurable data
- (-) TypeScript's type system is erased at runtime; the union has no runtime enforcement

**Rejected because**: TypeScript union types are a compile-time concept. Runtime-configurable values cannot be represented as union types. The entire purpose of the feature is to make areas dynamic, which is fundamentally at odds with static type unions.

### Alternative 3: Enum with Runtime Extension

Use a TypeScript enum and dynamically add members.

**Evaluation**:
- (+) Familiar pattern for fixed sets
- (-) TypeScript enums are not extensible at runtime
- (-) Enums compile to objects but adding members is not type-safe
- (-) Functional codebase avoids enums (no classes, no enums -- pure types and functions)

**Rejected because**: TypeScript enums are not runtime-extensible, and the functional codebase convention avoids them.

## Consequences

### Positive

- Dynamic areas fully supported -- no type system barrier
- Simpler types -- `string` is the most interoperable type for serialization, comparison, and display
- Zero data migration -- existing data already uses string values at runtime
- Validation function is explicit, testable, and reusable (add + rename share it)
- Constants eliminated -- single source of truth in AreaStorage

### Negative

- Loss of compile-time area name checking -- invalid area strings are not caught until runtime
- Test files lose auto-complete for area values (minor -- area strings are short and well-known)
- Runtime validation is the sole guard against invalid areas -- must be applied consistently at creation/rename boundaries

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Maintainability | Positive -- eliminates three redundant constants, single source of truth |
| Testability | Neutral -- union type checking replaced by validation function tests |
| Data Integrity | Neutral -- validation function provides equivalent protection at boundaries |
| Type Safety | Negative -- reduced compile-time checking, mitigated by runtime validation |

### Migration Effort

- Type change in `types.ts`: 1 line
- Remove 3 hardcoded constants: 3 locations
- Update `groupByArea` signature: 1 function + call sites
- Update `getSweepProgress` / trip creation: 1 factory function + call sites
- Update `MetadataBottomSheet`: 1 component (receive areas as prop)
- Update tests: change type assertions, provide area lists explicitly

### Supersedes

This ADR does not supersede any prior ADR. It extends the type system established in the original architecture.
