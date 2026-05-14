# Architecture

## Overview

Two apps + shared packages, one Bun runtime:

```
apps/
  web/         — React + Vite SPA
  backend/     — Hono server on Bun
packages/
  shared/      — types/constants used by both apps
  lint-rules/  — local ESLint plugin (Tailwind hygiene, feature boundaries)
```

Frontend talks to the backend over HTTP for room create/join, then upgrades to a websocket for live gameplay (TBD when backend lands).

## Frontend

### Route-driven feature scoping

A feature is a route folder. Each route owns its private internals via `-`-prefixed sibling folders (`-components/`, `-hooks/`, `-lib/`, `-types/`). TanStack Router ignores `-` folders, so the URL graph is unaffected. Imports of these private folders are confined to the owning route by lint (see `docs/DECISIONS.md`).

Global, reusable code lives outside `routes/`:

```
apps/web/src/
  ui/      ← design-system primitives shared across features
  lib/     ← global helpers
  hooks/   ← global hooks
  routes/
    __root.tsx               ← app shell
    _splash.tsx              ← pathless layout (splash background persists across nav)
    _splash/
      index.tsx              ← /
      game/create.tsx        ← /game/create
      -components/           ← private to _splash layout group
    game/$roomId/
      lobby.tsx              ← /game/:roomId/lobby
      play.tsx               ← /game/:roomId/play
      -components/           ← private to game/$roomId
```

### Layout persistence

Routes that benefit from a persistent background (the splash animation, in particular) sit under a pathless layout route (`_splash.tsx`). Navigating between siblings under that layout swaps only `<Outlet />`; the layout component and its state survive. The layout unmounts when the user leaves it (e.g. entering `/game/:roomId/lobby`), which intentionally tears down the splash animation.

### State management

For now: local component state + URL params. Will introduce a query/socket layer once the backend exists.

### Styling

Tailwind v4 with theme tokens declared in `apps/web/src/app.css` `@theme`. No arbitrary values for color, sizing, spacing, positioning, or text — see DECISIONS.md.

## Backend

<!-- API layer, business logic, database access — fill in when backend lands -->

## Data Flow

<!-- How data moves through the system end-to-end — fill in when backend lands -->
