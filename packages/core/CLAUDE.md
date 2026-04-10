# @gamehub/core

Shared TypeScript types and plugin interfaces. **Zero runtime dependencies** — only type exports.

## Files

- `src/types.ts` — `Player`, `ServerPlayer`, `GameConfig`, `GameSession`, `GamePhase`, `ClientGameState`
- `src/plugin.ts` — `GameServerPlugin`, `GameClientPlugin`, `GameActionContext`, `GameViewProps`, `MiniScoreboardData`
- `src/events.ts` — `PLATFORM_EVENTS` constants (event name strings)
- `src/index.ts` — re-exports all

## Rules

- **Only type definitions** — no implementation, no runtime code
- **No dependencies** — this package must remain dependency-free (except devDeps for TS types)
- Importy z `.js` extension (ESM convention): `from './types.js'`
- Każda zmiana tutaj wpływa na **wszystkie** pakiety — zmieniaj ostrożnie

## Plugin Interface Contract

### GameServerPlugin (server-side)
```
createInitialState() → unknown
handleAction(ctx, action, payload) → void
validateAction(action, payload, session, playerIndex, isHost) → string | null
serializeForClient(state, isHost, playerIndex) → unknown
resetState(session) → unknown
onGameStart?(payload, session) → void
reindexState?(state, removedIndex) → unknown
```

### GameClientPlugin (client-side)
```
config: GameConfig
HostView: ComponentType<GameViewProps>
ControllerView: ComponentType<GameViewProps>
SummaryView?: ComponentType<GameViewProps>
getMiniScoreboardData?(gameState, players) → MiniScoreboardData
```

### GameActionContext (passed to handleAction)
```
session: GameSession
updateState(mutator) — atomowa zmiana stanu gry
broadcastToRoom(event, data) — emit do całego pokoju
broadcastToOthers(event, data) — emit do wszystkich oprócz sendera
isHost: boolean
playerIndex: number | null
```

## TypeScript Check

```bash
npx tsc --noEmit -p packages/core/tsconfig.json
```
