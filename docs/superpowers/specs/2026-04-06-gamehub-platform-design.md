# GameHub — Platform Design Spec

## Context

Obecna aplikacja to Yahtzee score tracker z multiplayer LAN (host + kontrolery przez QR). Chcemy przekształcić ją w modularną platformę gier LAN — "GameHub" — gdzie Yahtzee jest pierwszym pluginem, a w przyszłości dojdą pubquizy, "Wiedza to Potęga" i inne gry.

Cel: wydzielić generyczny silnik (lobby, QR, reconnection, player management, socket sync) od logiki konkretnej gry, żeby dodanie nowej gry wymagało tylko napisania pluginu.

## Decyzje technologiczne

| Obszar | Wybór |
|--------|-------|
| Monorepo | pnpm workspaces |
| Runtime | Node.js |
| Frontend | Vite + React + TypeScript |
| Backend | Fastify + Socket.io + TypeScript |
| Game API | TS interface + konwencja folderów |
| Launcher | Lista kafelków z grami |
| Voice agent | Wyłączony (powróci jako opcjonalny plugin) |
| Scope | Pełna migracja — Yahtzee przepisane jako GamePlugin |

## Struktura monorepo

```
gamehub/
  package.json                    # workspace root
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    core/                         # @gamehub/core — shared types & interfaces
      package.json
      tsconfig.json
      src/
        index.ts
        types.ts                  # Player, GameSession, GameConfig, GamePhase
        plugin.ts                 # GameServerPlugin, GameClientPlugin, GameViewProps
        events.ts                 # PLATFORM_EVENTS constants

    server/                       # @gamehub/server — Fastify + Socket.io
      package.json
      tsconfig.json
      src/
        index.ts                  # entry point
        app.ts                    # Fastify factory + plugin registration
        socket.ts                 # platform socket event handlers
        store.ts                  # GameStore (in-memory Map<string, GameSession>)
        routes/
          games.ts                # POST /api/games, POST .../join, GET .../state
          server-info.ts          # GET /api/server-info (LAN IP for QR)
        plugin-loader.ts          # discovers + registers game plugins

    web/                          # @gamehub/web — Vite + React
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx
        App.tsx                   # React Router setup
        hooks/
          useSocket.ts            # Socket.io connection + reconnection
          useGameState.ts         # subscribes to game:state, game:state-patch
          useServerInfo.ts        # fetches /api/server-info
        context/
          GameContext.tsx          # current game session state
          SocketContext.tsx        # Socket.io instance provider
        pages/
          LauncherPage.tsx        # game tile grid
          LobbyPage.tsx           # QR + player list + start button
          JoinPage.tsx            # name entry for controller
          GamePage.tsx            # delegates to plugin HostView or ControllerView
        components/
          ConnectionBar.tsx       # ok / lost / connecting
          PlayerList.tsx          # dot + name + connection status
          QRDisplay.tsx           # QR code + game code + URL
          GameTile.tsx            # single tile in launcher
        styles/
          global.css
        plugin-registry.ts        # maps game IDs to lazy-loaded plugin modules

  games/
    yahtzee/                      # @gamehub/yahtzee
      package.json
      tsconfig.json
      src/
        index.ts                  # exports serverPlugin + clientPlugin
        server/
          handlers.ts             # score:update, game:reset handlers
          state.ts                # createInitialState, serializeForClient
        client/
          plugin.ts               # GameClientPlugin implementation
          HostView.tsx            # full score table
          ControllerView.tsx      # single-player card list
          components/
            ScoreTable.tsx
            SchoolInput.tsx       # sign toggle + input + X button
            FigureInput.tsx       # simple numeric input
            SumRow.tsx
            StickyHeader.tsx
            MiniBoard.tsx         # collapsible other-player totals
          scoring.ts              # parseSchool, parseFigure, calcSchoolSum, etc.
          categories.ts           # SCHOOL_CATEGORIES, FIGURE_CATEGORIES, PLAYER_COLORS
          types.ts                # YahtzeeState, YahtzeeValues
```

## Core Types (@gamehub/core)

### Player & Session

```typescript
export interface Player {
  index: number;
  name: string;
  connected: boolean;
}

export interface ServerPlayer extends Player {
  token: string;
  socketId: string | null;
}

export interface GameConfig {
  id: string;             // "yahtzee", "pubquiz"
  name: string;           // "Yahtzee"
  description: string;    // "Klasyczna gra w kości"
  minPlayers: number;
  maxPlayers: number;
  icon: string;           // emoji or path
  color: string;          // hex for tile
}

export interface GameSession {
  id: string;             // 6-char room code
  gameType: string;
  players: ServerPlayer[];
  gameState: unknown;     // opaque — owned by plugin
  hostToken: string;
  hostSocketId: string | null;
  hostConnected: boolean;
  phase: GamePhase;
  createdAt: Date;
}

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface ClientGameState {
  gameId: string;
  gameType: string;
  players: Player[];
  gameState: unknown;
  isHost: boolean;
  playerIndex: number | null;
  phase: GamePhase;
}
```

### GamePlugin Interface

**Server-side:**

```typescript
export interface GameServerPlugin {
  config: GameConfig;

  // Initial state when game is created
  createInitialState(): unknown;

  // Register game-specific socket handlers
  registerHandlers(ctx: GameSocketContext): void;

  // Serialize state for a specific client (can hide info per role)
  serializeForClient(
    gameState: unknown,
    isHost: boolean,
    playerIndex: number | null
  ): unknown;

  // Reset game state (host action)
  resetState(session: GameSession): unknown;

  // Optional: validate action before applying
  validateAction?(
    action: string,
    payload: unknown,
    session: GameSession,
    playerIndex: number | null,
    isHost: boolean
  ): string | null;
}

export interface GameSocketContext {
  socket: Socket;
  io: Server;
  getSession: () => GameSession;
  updateState: (mutator: (state: unknown) => unknown) => void;
  broadcastToRoom: (event: string, data: unknown) => void;
  broadcastToOthers: (event: string, data: unknown) => void;
  isHost: boolean;
  playerIndex: number | null;
}
```

**Client-side:**

```typescript
export interface GameClientPlugin {
  config: GameConfig;
  HostView: ComponentType<GameViewProps>;
  ControllerView: ComponentType<GameViewProps>;
  getMiniScoreboardData?: (gameState: unknown, players: Player[]) => MiniScoreboardData;
}

export interface GameViewProps {
  gameId: string;
  players: Player[];
  gameState: unknown;
  playerIndex: number | null;
  isHost: boolean;
  socket: Socket;
  onAction: (action: string, payload: unknown) => void;
}

export interface MiniScoreboardData {
  rows: Array<{
    label: string;
    values: (string | number | null)[];
    isTotal?: boolean;
  }>;
}
```

## Platform Events

Platforma obsługuje generyczne eventy — gry nigdy ich nie dotykają:

| Event | Kierunek | Opis |
|-------|----------|------|
| `game:connect` | client→server | Auth + dołączenie do pokoju |
| `game:state` | server→client | Pełny stan (connect/reconnect) |
| `game:error` | server→client | Błędy |
| `player:joined` | server→room | Nowy gracz |
| `player:status` | server→room | Connected/disconnected |
| `player:removed` | server→room | Gracz usunięty przez hosta |

Gry komunikują się przez **jeden event `game:action`**:
- Client→Server: `game:action { action: string, payload: unknown }`
- Server→Clients: `game:state-patch { type: string, ...data }` (granularne updaty)

Przykład Yahtzee:
- `game:action { action: 'score:update', payload: { category, playerIndex, value } }`
- `game:state-patch { type: 'score:changed', category, playerIndex, value }`

Przykład przyszłego quizu:
- `game:action { action: 'submit-answer', payload: { questionId, answer } }`
- `game:state-patch { type: 'timer:tick', remaining: 15 }`

## Routing

```
/                    → LauncherPage (kafelki gier)
/game/:gameId        → LobbyPage (host: QR + lista graczy + Start)
/game/:gameId/play   → GamePage (host: plugin.HostView)
/join/:gameId        → JoinPage (controller: wpisz imię)
/join/:gameId/play   → GamePage (controller: plugin.ControllerView)
```

React Router w `@gamehub/web`. Fastify serwuje SPA fallback (wszystkie ścieżki → index.html).

## Server Architecture (@gamehub/server)

### Fastify Setup

```typescript
// app.ts — factory function
export async function createApp() {
  const fastify = Fastify({ logger: true });
  const store = new GameStore();
  const plugins = await loadPlugins();

  // Static (Vite build output)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../web/dist'),
  });

  // REST routes
  fastify.register(createGameRoutes(store, plugins));
  fastify.register(createServerInfoRoute());

  // SPA fallback
  fastify.setNotFoundHandler((req, reply) => reply.sendFile('index.html'));

  // Socket.io
  const io = new Server(fastify.server);
  createSocketHandler(io, store, plugins);

  return fastify;
}
```

### REST Endpoints

| Metoda | Ścieżka | Zmiana vs obecny |
|--------|---------|------------------|
| `POST` | `/api/games` | Body: `{ gameType }`. Wywołuje `plugin.createInitialState()` |
| `POST` | `/api/games/:gameId/join` | Bez zmian (generyczny) |
| `GET` | `/api/games/:gameId` | Dodaje `gameType` i `phase` do response |
| `GET` | `/api/server-info` | Bez zmian |
| `GET` | `/api/game-types` | **Nowy** — lista dostępnych gier (dla launchera) |

### Socket Handler

Platforma obsługuje `game:connect` i `disconnect` identycznie jak teraz. Na `game:action`:

1. Auth check (token → player/host)
2. `plugin.validateAction()` (opcjonalnie)
3. Przekazanie do `plugin.registerHandlers()` — plugin sam obsługuje action

Plugin dostaje `GameSocketContext` z helperami:
- `getSession()` — aktualny stan
- `updateState(mutator)` — atomowa zmiana stanu
- `broadcastToRoom()` / `broadcastToOthers()` — emisja do pokoju

### GameStore

In-memory `Map<string, GameSession>`. Metody:
- `create(gameType, initialState)` → session
- `get(gameId)` → session | undefined
- `addPlayer(gameId, name)` → { playerIndex, playerToken } | { error }
- `removePlayer(gameId, playerIndex)` — z reindexacją
- `updateGameState(gameId, mutator)`
- `setPhase(gameId, phase)`

## Web Architecture (@gamehub/web)

### LauncherPage

Grid kafelków — każdy kafelek to `GameTile` z:
- Ikoną (emoji)
- Nazwą gry
- Opisem
- Zakresem graczy (np. "1-8 graczy")

Klik → `POST /api/games { gameType }` → navigate to `/game/:gameId`.

Dane kafelków z `GET /api/game-types` (serwer zbiera `config` z każdego pluginu).

### Shared Hooks

**`useSocket()`** — zarządza połączeniem Socket.io:
- Singleton socket instance
- Auto-reconnect
- Stan: `connected`, `connecting`, `disconnected`
- Na reconnect → re-emituje `game:connect` z tokenem z sessionStorage

**`useGameState(gameId)`** — subskrybuje eventy gry:
- `game:state` → pełna podmiana stanu
- `game:state-patch` → przekazuje do listenera (plugin wie jak zaaplikować)
- `player:joined`, `player:status` → aktualizuje listę graczy
- Zwraca: `{ players, gameState, isHost, playerIndex, phase, gameType, connected }`

### GamePage

```tsx
function GamePage({ mode }: { mode: 'host' | 'controller' }) {
  const { gameId } = useParams();
  const state = useGameState(gameId);
  const plugin = useGamePlugin(state.gameType); // lazy-loaded

  const View = mode === 'host' ? plugin.HostView : plugin.ControllerView;

  return (
    <View
      gameId={gameId}
      players={state.players}
      gameState={state.gameState}
      playerIndex={state.playerIndex}
      isHost={state.isHost}
      socket={socket}
      onAction={(action, payload) => socket.emit('game:action', { action, payload })}
    />
  );
}
```

### Plugin Registry

Statyczny mapping z lazy importami (code splitting):

```typescript
const registry = {
  yahtzee: () => import('@gamehub/yahtzee/client'),
};
```

## Yahtzee Plugin (@gamehub/yahtzee)

### State

```typescript
interface YahtzeeState {
  values: Record<string, Record<number, string>>;
  // values[category][playerIndex] = raw string ('+5', '-3', 'x', '25')
}
```

Identyczny kształt jak obecny. Serwer traktuje jako opaque.

### Server Handlers

```typescript
function createHandlers(ctx: GameSocketContext) {
  ctx.socket.on('game:action', ({ action, payload }) => {
    if (action === 'score:update') {
      const { category, playerIndex, value } = payload;
      ctx.updateState((state: YahtzeeState) => {
        if (!state.values[category]) state.values[category] = {};
        state.values[category][playerIndex] = value;
        return state;
      });
      ctx.broadcastToOthers('game:state-patch', {
        type: 'score:changed', category, playerIndex, value,
      });
    }
    if (action === 'game:reset') {
      ctx.updateState(() => ({ values: {} }));
      ctx.broadcastToOthers('game:state-patch', { type: 'reset' });
    }
  });
}
```

Authorization w `validateAction`:
- `score:update` → gracz może edytować tylko swoją kolumnę, host może każdą
- `game:reset` → tylko host

### Client Components

**HostView** — React port `renderHostGame()` z obecnego kodu:
- `ScoreTable` — `<table>` z sekcjami Szkoła/Figury
- `SchoolInput` — `+/-` toggle + input + X button
- `FigureInput` — prosty input numeryczny
- `SumRow` / `TotalRow` — kalkulowane sumy
- `StickyHeader` — IntersectionObserver sticky
- Toolbar — QR, Admin, Reset, Nowa gra
- Drag-drop reorder kolumn

**ControllerView** — React port `renderControllerView()`:
- Lista 17 kategorii w kartach (szkoła z ±/x, figury z inputem)
- Sekcje Szkoła + Figury z sumami
- MiniBoard — zwijalna tabelka totalów wszystkich graczy

### Scoring Logic

Przeniesione 1:1 jako pure functions (parametr `values` zamiast globala):
- `parseSchool(raw)` — `'x'` → 0, `'+5'`/`'-5'` → ±5
- `parseFigure(raw)` — tylko pozytywne integery
- `calcSchoolSum(values, playerIdx)` — sum + bonus (±100 jeśli wszystkie 6 wypełnione)
- `calcFigureSum(values, playerIdx)` — prosta suma
- `calcTotal(values, playerIdx)` — school + figure
- `isSchoolComplete(values, playerIdx)`
- `countFilled(categories, values, playerIdx)`

### Categories

```typescript
const SCHOOL_CATEGORIES = ['Jedynki (1)', 'Dwójki (2)', 'Trójki (3)', 'Czwórki (4)', 'Piątki (5)', 'Szóstki (6)'];
const FIGURE_CATEGORIES = ['Jedna para', 'Dwie pary', 'Trójka', 'Kareta', 'Full', 'Mały street', 'Duży street', 'Generał', 'Nieparzyste', 'Parzyste', 'Losowe'];
const PLAYER_COLORS = [/* 8 par kolorów — identyczne jak obecne */];
```

## Game Lifecycle

```
1. LAUNCHER     / → host klika kafelek "Yahtzee"
2. CREATE       POST /api/games { gameType: 'yahtzee' }
                → gameId + hostToken → sessionStorage
                → navigate /game/:gameId
3. LOBBY        Host widzi QR + listę graczy
                Gracze skanują QR → /join/:gameId → wpisują imię → POST .../join
                Socket game:connect, player:joined broadcasts
4. START        Host klika "Rozpocznij grę"
                → game:action { action: 'start' }
                → phase: 'playing'
                → host → /game/:gameId/play
                → kontrolery auto-transition do ControllerView
5. PLAY         Gracze wpisują wyniki
                → game:action { action: 'score:update', payload }
                → server validates, updates, broadcasts game:state-patch
                → host view updates cell + flash animation + sum recalc
6. RECONNECT    Socket disconnect → player:status { connected: false }
                Auto-reconnect → game:connect z tokenem z sessionStorage
                → pełny game:state → re-render
7. RESET        Host: "Resetuj" → game:action { action: 'game:reset' }
                Host: "Nowa gra" → clear sessionStorage → navigate /
```

## Data Flow (Score Update)

```
[Telefon: ControllerView]
  User wpisuje "25" w "Jedna para"
  → onAction('score:update', { category: 'Jedna para', playerIndex: 0, value: '25' })
  → socket.emit('game:action', { action: 'score:update', payload })

[Server]
  game:action received
  → validateAction() → OK (player edits own column)
  → plugin handler: updateState → values['Jedna para'][0] = '25'
  → broadcastToOthers('game:state-patch', { type: 'score:changed', ... })

[Laptop: HostView]
  game:state-patch received
  → React state update for that cell
  → ScoreTable re-renders affected cell
  → Flash animation CSS
  → Sum recalculation
```

## Build & Dev

### Vite Dev Server

Proxy `/api/*` i `/socket.io/*` do Fastify backend (port 3001):

```typescript
// packages/web/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
```

### Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @gamehub/server dev\" \"pnpm --filter @gamehub/web dev\"",
    "build": "pnpm -r build",
    "start": "pnpm --filter @gamehub/server start"
  }
}
```

### Package Dependencies

```
@gamehub/core:     (zero runtime deps — pure TS types)
@gamehub/server:   fastify, @fastify/static, socket.io, @gamehub/core
@gamehub/web:      react, react-dom, react-router-dom, socket.io-client, qrcode-generator, @gamehub/core
@gamehub/yahtzee:  @gamehub/core (peer: react)
```

Root devDependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `concurrently`, `tsx` (dev server), `eslint`.

## Fazy implementacji

### Faza 1: Scaffold monorepo + core
- pnpm workspace setup
- `@gamehub/core` — wszystkie typy i interfejsy
- tsconfig project references
- Root package.json scripts

### Faza 2: Server
- Port server.js → Fastify + TS
- GameStore class
- Platform socket handlers (game:connect, disconnect, player:joined/status)
- REST routes (games, join, state, server-info, game-types)
- Plugin loader

### Faza 3: Yahtzee server plugin
- handlers.ts — score:update, game:reset
- state.ts — createInitialState, serializeForClient
- validateAction — auth per column

### Faza 4: Web shell
- Vite + React setup
- LauncherPage, LobbyPage, JoinPage, GamePage
- Socket hooks (useSocket, useGameState)
- Shared components (ConnectionBar, QRDisplay, PlayerList, GameTile)
- Plugin registry

### Faza 5: Yahtzee client plugin
- HostView (ScoreTable, SchoolInput, FigureInput, SumRow, StickyHeader, Toolbar)
- ControllerView (category cards, sums, MiniBoard)
- scoring.ts — pure functions
- CSS migration

### Faza 6: Integration & polish
- End-to-end flow (create → join → play → reconnect → reset)
- Mobile responsiveness
- Admin mode (host cell editing)
- Column drag-reorder
- Flash animation on remote updates

## Weryfikacja

1. `pnpm install && pnpm dev`
2. Otwórz localhost:5173 → launcher z kafelkiem Yahtzee
3. Kliknij Yahtzee → lobby z QR kodem
4. Zeskanuj QR telefonem → ekran dołączania
5. Wpisz imię, dołącz → host widzi gracza na liście
6. Host klika "Rozpocznij" → pełna tablica na laptopie, karta wyników na telefonie
7. Wpisz wynik na telefonie → host widzi zmianę natychmiast (flash animation)
8. Zablokuj telefon, odblokuj → reconnect, stan zachowany
9. Drugi telefon → drugi gracz, równoczesne zmiany
10. Host "Resetuj pola" → wszystkie komórki wyzerowane
11. Host "Nowa gra" → powrót do launchera

## Pliki źródłowe do migracji

- `server.js` (278 linii) → `packages/server/src/` (platform) + `games/yahtzee/src/server/` (plugin)
- `index.html` linie 211-315 → `games/yahtzee/src/client/scoring.ts` + `categories.ts`
- `index.html` linie 544-870 → `games/yahtzee/src/client/HostView.tsx` + components
- `index.html` linie 887-1141 → `games/yahtzee/src/client/ControllerView.tsx` + components
- `index.html` linie 317-425 → `packages/web/src/hooks/` (socket, state management)
- `index.html` linie 1-210 → `packages/web/src/styles/` + shared components
