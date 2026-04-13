# ADR 0002: Versioning and Release Model

## Status

Accepted

## Context

The platform needs editable drafts, immutable published releases, and long-term support for schema evolution.

## Decision

- Draft projects remain mutable.
- Published releases are immutable snapshots.
- Adventure content is versioned with a mandatory `schemaVersion`.
- Save data will be versioned separately.

## Consequences

- Runtime loading can rely on stable release payloads.
- Draft autosave and editor workflows can evolve independently from published content.
- Migration code becomes a first-class part of the platform instead of an afterthought.
