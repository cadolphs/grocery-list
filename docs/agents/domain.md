# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the ubiquitous language (sweep decision, trip, carryover, ...). Use its terms and avoid the synonyms it lists.
- **`docs/adrs/`**: read ADRs that touch the area you're about to work in. `docs/adrs/README.md` is the index, including the "never" decisions (no classes, no pushes to `main`, no agent production-data access). This repo spells the folder `adrs` and names files `ADR-NNN-<slug>.md`; wherever a skill says `docs/adr/`, read `docs/adrs/`.
- **`docs/primitives.md`**: the architecture and the primitives features compose. Architecture, not vocabulary; `GLOSSARY.md` has the words.

The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) adds terms to `GLOSSARY.md` as they get resolved. New ADRs go in `docs/adrs/` with the next free number, and get a line in `docs/adrs/README.md`.

## File structure

Single-context repo (this one):

```
/
├── GLOSSARY.md                        ← maintained by /domain-modeling
├── docs/adrs/
│   ├── README.md                      ← index
│   ├── ADR-009-no-classes-fp-only.md
│   └── ADR-012-no-mandated-feature-workflow.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids. Until the glossary exists, use the names in `docs/primitives.md` and the code (staple, trip, sweep, house area, store section, aisle).

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-009 (no classes), but worth reopening because…_
