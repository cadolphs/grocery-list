# ADR-009: No classes — functional TypeScript only

Status: accepted Date: 2026-11-02

## Decision

Do not add classes, `this`, or inheritance. Build with factory functions that
return plain objects, pure domain functions in `src/domain/`, port types in
`src/ports/`, and React hooks for UI state. Do not mutate arguments.

## Why

The whole codebase follows this (ADR-001-architecture-style-and-paradigm).
Mixed paradigms make the ports-and-adapters seams harder to test and to
mutation-test, and agents tend to re-propose class-based services.

## Revisit if

A required library API can only be used by subclassing (wrap it in an adapter
first), or the project leaves TypeScript.
