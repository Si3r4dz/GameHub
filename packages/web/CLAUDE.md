# @gamehub/web

Vite 6 + React 19 frontend. Launcher, lobby, widoki gry (host + controller).

## Running

```bash
pnpm --filter @gamehub/web dev       # Vite dev server, port 5173
pnpm --filter @gamehub/web build     # tsc + vite build → dist/
```

Dev server proxy: `/api/*` i `/socket.io/*` → `localhost:3001`

## Routing

```
/                    → LauncherPage   (kafelki gier, wybór trybu: multiplayer/lokalny)
/game/:gameId        → LobbyPage      (host: QR + lista graczy + config rund)
/game/:gameId/play   → GamePage       (host: plugin.HostView)
/join/:gameId        → JoinPage       (controller: wpisz imię)
/join/:gameId/play   → GamePage       (controller: plugin.ControllerView)
```

Gdy `phase === 'finished'` → GamePage renderuje `plugin.SummaryView`

## Files

```
src/
  main.tsx                    — React root
  App.tsx                     — BrowserRouter + routes
  plugin-registry.ts          — lazy import pluginów per gameType
  context/
    SocketContext.tsx          — singleton Socket.io, useSocket() hook
  hooks/
    useSocketConnection.ts    — connect/disconnect/reconnect, auto-rejoin on reconnect
    useGameState.ts           — subskrypcja game:state, game:state-patch, player events
    useWakeLock.ts            — Wake Lock API (zapobiega wygaszaniu ekranu)
  pages/
    LauncherPage.tsx          — game tiles + tryb multiplayer/lokalny
    LobbyPage.tsx             — QR (multiplayer) lub input graczy (local) + slider rund
    JoinPage.tsx              — name entry + session recovery z sessionStorage
    GamePage.tsx              — ładuje plugin, renderuje HostView/ControllerView/SummaryView
  components/
    ConnectionBar.tsx         — connected/connecting/disconnected indicator
    PlayerList.tsx            — lista graczy z kropkami statusu
    QRDisplay.tsx             — QR code + game code + URL (qrcode-generator z CDN)
    GameTile.tsx              — kafelek gry w launcherze
  styles/
    global.css                — base styles, shared components, responsive breakpoints
```

## State Management

- **Socket context** — singleton Socket.io instance via React Context
- **useGameState hook** — centralne źródło stanu gry, aplikuje patche
- **Optimistic updates** — `sendAction()` aplikuje patch lokalnie od razu + emituje do serwera
- **Patch handler** — `defaultPatchHandler` w GamePage.tsx, game-specific (score:changed, reset, round-advanced)
- **sessionStorage** — tokeny (`gamehub_token`, `gamehub_ctrl_token`), gameId, tryb lokalny

## Rules

- **Plugin loading** — lazy `import()` w `plugin-registry.ts`, code splitting per gra
- **Nowe gry** — dodaj loader w `plugin-registry.ts`: `nowaGra: () => import('@gamehub/nowa-gra/client')`
- **Shared components** — `ConnectionBar`, `PlayerList`, `QRDisplay` nie zawierają logiki game-specific
- **Mobile-first** — controller view ma duże touch targety (min 44px), responsive CSS
- **QR URL** — używa `window.location.port` (nie server port) żeby działał z Vite dev proxy
- **Wake Lock** — aktywny na GamePage, działa na Android Chrome (iOS ograniczone wsparcie)
- **Tekst po polsku** — wszystkie komunikaty UI

## TypeScript Check

```bash
npx tsc --noEmit -p packages/web/tsconfig.json
```
