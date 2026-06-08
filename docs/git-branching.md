# Git Branching Guide

This project follows a simple branching strategy focused on experimentation, rapid iteration, and low process overhead.

## Principles

* Keep branching simple.
* Prefer short-lived branches.
* Use branches to isolate work, not create process.
* Tag releases from `main`.
* Delete branches when they are no longer needed.

## Branch Types

### `main`

The stable branch.

* Always contains the latest accepted work.
* Used for releases and version tags.
* Should remain buildable and usable.

### `spike/*`

Experimental work.

Used for exploring ideas, architecture, tooling, or implementation approaches.

Examples:

```text
spike/foundation
spike/build-system
spike/component-architecture
```

Spikes may be discarded, rewritten, or merged if successful.

### `feature/*`

Work that is intended to ship.

Examples:

```text
feature/header
feature/product-card
feature/cart-drawer
```

Feature branches should be focused and short-lived.

## Releases

Releases are created from `main` using Git tags.

Examples:

```text
v0.1.0
v0.2.0
v1.0.0
```

## Workflow

1. Create a `spike/*` branch for experiments.
2. Create a `feature/*` branch for production work.
3. Merge completed work into `main`.
4. Tag meaningful milestones.
5. Remove branches that are no longer needed.

## Future Evolution

As the project grows and gains contributors, this strategy may evolve. Until then, simplicity is preferred over process.
