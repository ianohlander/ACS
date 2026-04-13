# ADR 0001: Architecture Boundaries

## Status

Accepted

## Context

The project needs to begin as a retro browser game while preserving clear paths to richer rendering, more advanced AI, and future simulation changes.

## Decision

- Use a TypeScript monorepo with separate app and package boundaries.
- Keep runtime core renderer-agnostic.
- Treat content as versioned data rather than hardcoded game logic.
- Share schema and validation logic across tools and backend services.

## Consequences

- Early progress emphasizes domain modeling over visual polish.
- Rendering technology can evolve without forcing a content rewrite.
- Future editor and automation features can build on stable shared contracts.
