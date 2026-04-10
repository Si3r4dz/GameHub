# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GameHub** — modular LAN multiplayer game platform. Games are implemented as plugins. First game: Yahtzee score tracker.

## Architecture

Monorepo z pnpm workspaces:

```
packages/
  core/       @gamehub/core     — shared TS types & plugin interfaces (zero runtime deps)
  server/     @gamehub/server   — Fastify 5 + Socket.io 4 backend
  web/        @gamehub/web      — Vite 6 + React 19 frontend
games/
  yahtzee/    @gamehub/yahtzee  — first game plugin
```

## Running

```bash
pnpm install
pnpm dev          # Fastify :3001 + Vite :5173
pnpm build        # all packages
pnpm start        # production (Fastify serves built frontend)
```

## Plugin System

Każda gra implementuje dwa interfejsy z `@gamehub/core`:

**Server** (`GameServerPlugin`):
- `createInitialState()` → initial game state
- `handleAction(ctx, action, payload)` → mutates state, broadcasts patches
- `validateAction()` → blocks invalid moves
- `serializeForClient()` → co klient widzi (można ukryć info per rola)
- `onGameStart()` → konfiguracja przy starcie (np. ilość rund)
- `reindexState()` → przeindeksowanie po usunięciu gracza

**Client** (`GameClientPlugin`):
- `HostView` — React component (laptop, pełna tablica)
- `ControllerView` — React component (telefon gracza)
- `SummaryView` — React component (ekran podsumowania po grze)
- `getMiniScoreboardData()` — dane do mini-tablicy wyników

## Communication Flow

```
Client → game:action { action, payload }
  → Server validates (plugin.validateAction)
  → Server applies (plugin.handleAction → ctx.updateState)
  → Server broadcasts game:state-patch to others
  → Client applies patch locally (optimistic update for sender)
```

Platform events: `game:connect`, `game:state`, `player:joined`, `player:status`

## Key Conventions

- **All UI text in Polish** — nazwy kategorii, komunikaty, przyciski
- **LAN only** — no cloud auth, in-memory state, token-based sessions
- **Max 8 players** per game
- **Mobile-first** controller view, desktop host view
- **Two game modes**: Multiplayer (QR + telefony) i Lokalna gra (jeden ekran, admin zarządza)
- **sessionStorage keys**: `gamehub_gameId`, `gamehub_token`, `gamehub_ctrl_token`, `gamehub_local`

## TypeScript

- `tsconfig.base.json` w root — strict, ES2022, ESNext modules, bundler resolution
- Każdy pakiet ma swój `tsconfig.json` z `extends: ../../tsconfig.base.json`
- Check: `npx tsc --noEmit -p packages/core/tsconfig.json` (per package)

## Legacy Files

`server.js`, `index.html`, `tools/` — stara wersja (pre-platform). Nie modyfikować. Do usunięcia po pełnej walidacji nowej wersji.
