# @gamehub/server

Fastify 5 + Socket.io 4 backend. Zarządza sesjami gier, autentykacją (tokeny), stanem i komunikacją real-time.

## Running

```bash
pnpm --filter @gamehub/server dev    # tsx watch, port 3001
pnpm --filter @gamehub/server start  # tsx (production)
```

## Files

```
src/
  index.ts          — entry point, startuje serwer na 0.0.0.0:3001
  app.ts            — Fastify factory: static files, routes, socket.io, SPA fallback
  store.ts          — GameStore class (in-memory Map<gameId, GameSession>)
  socket.ts         — Socket.io handler: game:connect, game:action, disconnect
  plugin-loader.ts  — dynamiczny import pluginów gier
  env.d.ts          — deklaracje modułów dla pluginów
  routes/
    games.ts        — REST: /api/games, /api/games/:id/join, /api/games/:id, /api/game-types
    server-info.ts  — REST: /api/server-info (LAN IP do QR)
```

## REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/game-types` | Lista dostępnych gier (plugin configs) |
| POST | `/api/games` | Tworzy grę `{ gameType }` → `{ gameId, hostToken }` |
| POST | `/api/games/:id/join` | Gracz dołącza `{ name }` → `{ playerIndex, playerToken }` |
| GET | `/api/games/:id?token=` | Stan gry (auth via token) |
| GET | `/api/server-info` | `{ ip, port }` do QR |

## Socket.io Events

**Platform (socket.ts obsługuje bezpośrednio):**
- `game:connect { gameId, token }` — auth + join room + send state
- `game:action { action: 'start' }` — host starts game, calls `plugin.onGameStart()`
- `game:action { action: 'finish-game' }` — sets phase to 'finished'
- `game:action { action: 'remove-player' }` — removes player, reindexes
- `disconnect` — marks player/host disconnected

**Game-specific (delegowane do plugin.handleAction):**
- Wszystkie inne `game:action` przechodzą przez `validateAction()` → `handleAction()`
- Akcje z `needsFullRefresh` (np. `next-round`) → po handleAction serwer wysyła pełny state do pokoju

## Rules

- **Token auth** — hostToken i playerToken, brak haseł
- **State mutations** — tylko przez `store.updateGameState(gameId, mutator)` lub `plugin.handleAction(ctx)`
- **Per-socket serialization** — `sendStateToRoom()` wysyła do każdego socketa state z poprawnym `isHost`/`playerIndex`
- **Stale socket protection** — disconnect sprawdza `socket.id === stored socketId` przed czyszczeniem statusu
- **Room cleanup** — `game:connect` opuszcza poprzednie pokoje przed dołączeniem do nowego
- **Plugin loader** — nowe gry dodawaj w `plugin-loader.ts` jako explicit import

## Dodawanie nowego pluginu gry

1. Stwórz pakiet w `games/nowa-gra/`
2. Zaimplementuj `GameServerPlugin` i wyeksportuj jako `serverPlugin`
3. Dodaj import w `plugin-loader.ts`
4. Dodaj `@gamehub/nowa-gra` jako dependency w `package.json`
5. Dodaj deklarację modułu w `env.d.ts`

## TypeScript Check

```bash
npx tsc --noEmit -p packages/server/tsconfig.json
```
