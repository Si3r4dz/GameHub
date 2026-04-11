# GameHub

A modular LAN multiplayer game platform. The host laptop runs the server and displays the game board, while players use their phones as controllers. Games are plugins — add a new game without modifying the platform.

## Games

| Game | Description | Players |
|------|-------------|---------|
| **Yahtzee** | Score tracker with two sections (School + Figures), multi-round | 1–8 |
| **Quiz** | Pub quiz with ABCD options, timer, scoring based on speed & accuracy | 1–8 |

## How It Works

```
  Laptop (host)              Phones (players)
  ┌─────────────┐            ┌──────────┐
  │  HostView   │◄──WiFi───►│Controller│
  │  (questions, │  Socket.io │ (ABCD    │
  │   scores)   │            │  buttons)│
  └──────┬──────┘            └──────────┘
         │
    Fastify + Socket.io
    (server on laptop)
```

1. Host starts the server on the laptop
2. Players scan QR code with their phones (LAN, same WiFi)
3. Host starts the game — questions/scoreboard on the laptop, controls on phones
4. After the game, everyone returns to the hub for the next game

## Hub (Game Night Mode)

Players scan the QR code **once** and stay in a lobby. The host starts games one after another without players needing to reconnect:

- **Multiplayer** — phones as controllers
- **Local** — single screen, host manages everything

There's also a "Quick Game" mode — classic per-game flow without the hub.

## Getting Started

```bash
# Requirements: Node.js 18+, pnpm
pnpm install          # uses frozen lockfile by default (clean install)
pnpm dev
```

Dev server:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Phones: scan QR or go to `http://<laptop-IP>:5173`

Production:
```bash
pnpm build
pnpm start    # Fastify serves the frontend + API on port 3001
```

## Architecture

```
packages/
  core/       @gamehub/core     — shared TS types & plugin interfaces (zero deps)
  server/     @gamehub/server   — Fastify 5 + Socket.io 4
  web/        @gamehub/web      — Vite 6 + React 19
games/
  yahtzee/    @gamehub/yahtzee  — plugin: score tracker
  quiz/       @gamehub/quiz     — plugin: timed ABCD quiz
```

pnpm workspaces monorepo. Each game is a separate package exporting `GameServerPlugin` + `GameClientPlugin`.

## Plugin System

Each game implements two interfaces:

**Server** (`GameServerPlugin`):
- `createInitialState()` — initial game state
- `handleAction(ctx, action, payload)` — game logic
- `serializeForClient(state, isHost, playerIndex)` — what the client sees (info hiding)
- `onTick?(session, broadcast)` — timer hook (every second)

**Client** (`GameClientPlugin`):
- `HostView` — React component for the laptop
- `ControllerView` — React component for phones
- `SummaryView` — end-of-game summary screen

## Adding a New Game

1. Create a package in `games/your-game/`
2. Implement `GameServerPlugin` and `GameClientPlugin`
3. Add the import in `packages/server/src/plugin-loader.ts`
4. Add a lazy import in `packages/web/src/plugin-registry.ts`
5. `pnpm install` and you're done

## Contributing

We use **feature branches + PRs**:

1. Create a branch from `main`: `git checkout -b feature/your-feature`
2. Make your changes, commit
3. Push and open a Pull Request
4. Get a review, merge to `main`

Branch naming: `feature/...`, `fix/...`, `chore/...`

## Tech Stack

- **Frontend**: React 19, Vite 6, TypeScript
- **Backend**: Fastify 5, Socket.io 4, TypeScript
- **Monorepo**: pnpm workspaces
- **Auth**: tokens (in-memory, LAN-only)
- **State**: server-authoritative with optimistic client updates

## License

MIT — see [LICENSE.md](LICENSE.md)
