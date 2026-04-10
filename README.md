# GameHub

Modularna platforma LAN do gier multiplayer. Laptop jest hostem, telefony graczy kontrolerami. Gry to pluginy — dodajesz nową grę bez modyfikacji platformy.

## Gry

| Gra | Opis | Graczy |
|-----|------|--------|
| **Yahtzee** | Tracker wyników z dwoma sekcjami (Szkola + Figury), wielorundowy | 1-8 |
| **Quiz** | Pub quiz ABCD z timerem, punktacja za szybkosc i poprawnosc | 1-8 |

## Jak to dziala

```
  Laptop (host)              Telefony (gracze)
  ┌─────────────┐            ┌──────────┐
  │  HostView   │◄──WiFi───►│Controller│
  │  (pytania,  │  Socket.io │(przyciski│
  │   tabela)   │            │ ABCD)    │
  └──────┬──────┘            └──────────┘
         │
    Fastify + Socket.io
    (serwer na laptopie)
```

1. Host odpala serwer na laptopie
2. Gracze skanuja QR telefonem (LAN, ten sam WiFi)
3. Host startuje gre — pytania/tabela na laptopie, przyciski na telefonach
4. Po grze wszyscy wracaja do huba, host odpala nastepna gre

## Hub (wieczor gier)

Gracze skanuja QR **raz** i sa w poczekalni. Host startuje gry jedna po drugiej bez ponownego laczenia:

- **Multiplayer** — telefony jako kontrolery
- **Lokalny** — jeden ekran, host zarzadza wszystkim

Jest tez tryb "Szybka gra" — klasyczny per-game flow bez huba.

## Uruchomienie

```bash
# Wymagania: Node.js 18+, pnpm
pnpm install
pnpm dev
```

Dev server:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Telefony: skanuj QR lub wejdz na `http://<IP-laptopa>:5173`

Production:
```bash
pnpm build
pnpm start    # Fastify serwuje frontend + API na porcie 3001
```

## Architektura

```
packages/
  core/       @gamehub/core     — typy TS, interfejsy pluginow (zero deps)
  server/     @gamehub/server   — Fastify 5 + Socket.io 4
  web/        @gamehub/web      — Vite 6 + React 19
games/
  yahtzee/    @gamehub/yahtzee  — plugin: tracker wynikow
  quiz/       @gamehub/quiz     — plugin: quiz ABCD z timerem
```

Monorepo z pnpm workspaces. Kazda gra to osobny pakiet eksportujacy `GameServerPlugin` + `GameClientPlugin`.

## System pluginow

Kazda gra implementuje dwa interfejsy:

**Server** (`GameServerPlugin`):
- `createInitialState()` — poczatkowy stan gry
- `handleAction(ctx, action, payload)` — logika gry
- `serializeForClient(state, isHost, playerIndex)` — co widzi klient (ukrywanie info)
- `onTick?(session, broadcast)` — timer hook (co sekunde)

**Client** (`GameClientPlugin`):
- `HostView` — React component na laptopie
- `ControllerView` — React component na telefonie
- `SummaryView` — ekran podsumowania

## Dodawanie nowej gry

1. Stworz pakiet w `games/twoja-gra/`
2. Zaimplementuj `GameServerPlugin` i `GameClientPlugin`
3. Dodaj import w `packages/server/src/plugin-loader.ts`
4. Dodaj lazy import w `packages/web/src/plugin-registry.ts`
5. `pnpm install` i gotowe

## Tech stack

- **Frontend**: React 19, Vite 6, TypeScript
- **Backend**: Fastify 5, Socket.io 4, TypeScript
- **Monorepo**: pnpm workspaces
- **Auth**: tokeny (in-memory, LAN-only)
- **State**: server-authoritative, optimistic updates na kliencie

## Licencja

MIT — patrz [LICENSE.md](LICENSE.md)
