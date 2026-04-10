# @gamehub/yahtzee

Plugin Yahtzee — tracker wyników z dwoma sekcjami (Szkoła + Figury), wielorundowy.

## Exports

```
"."        → src/index.ts       (serverPlugin: GameServerPlugin)
"./client" → src/client/plugin.ts (clientPlugin: GameClientPlugin)
```

## Game State

```typescript
YahtzeeState {
  currentRound: number       // 0-indexed
  totalRounds: number        // 1-10
  rounds: RoundData[]        // zamrożone zakończone rundy
  values: Record<string, Record<number, string>>  // aktualna runda
}

RoundData {
  values: Record<string, Record<number, string>>   // zamrożone wartości
  totals: Record<number, { school, figure, total }> // obliczone sumy per gracz
}
```

## Scoring Rules

### Szkoła (6 kategorii)
- Jedynki (1) → Szóstki (6)
- Dozwolone wartości: `+N`, `-N`, `x` (zero), lub plain `N`
- **Bonus**: gdy wszystkie 6 wypełnione: `sum < 0 ? -100 + sum : +100 + sum`

### Figury (11 kategorii)
- Jedna para, Dwie pary, Trójka, Kareta, Full, Mały street, Duży street, Generał, Nieparzyste, Parzyste, Losowe
- Dozwolone wartości: tylko pozytywne integery
- Prosta suma

### Runda
- Kompletna gdy wszyscy gracze wypełnili wszystkie 17 kategorii
- Sumy ukryte do zakończenia rundy (pokazują `X/6`, `Y/11`, `Z/17`)
- Po zakończeniu: sumy odkryte, host może przejść do następnej rundy

## Actions

| Action | Payload | Auth | Effect |
|--------|---------|------|--------|
| `score:update` | `{ category, playerIndex, value }` | Gracz: swoja kolumna. Host: każda | Updates values, broadcasts patch |
| `game:reset` | `{}` | Host only | Clears values |
| `next-round` | `{}` | Host only, runda kompletna | Zamraża rundę, czyści values, advance |
| `configure` | `{ totalRounds }` | Host only (at start) | Sets total rounds 1-10 |

## Files

```
src/
  index.ts                — serverPlugin export + onGameStart config
  server/
    state.ts              — YahtzeeState, scoring functions (server-side), freeze/reindex
    handlers.ts           — handleAction + validateAction
  client/
    types.ts              — client-side type mirrors
    categories.ts         — SCHOOL_CATEGORIES (6), FIGURE_CATEGORIES (11), PLAYER_COLORS (8)
    scoring.ts            — parseSchool, parseFigure, calcSchoolSum, calcFigureSum, calcTotal, isAllComplete
    plugin.ts             — clientPlugin export (HostView, ControllerView, SummaryView)
    HostView.tsx           — pełna tabela, drag-reorder kolumn, sticky header, admin mode, round controls
    ControllerView.tsx     — widok jednokolumnowy na telefon, mini-scoreboard
    GameSummary.tsx        — ekran podsumowania po grze (tabela rund, zwycięzca)
    yahtzee.css            — game-specific styles
    components/
      SchoolInput.tsx      — input z ±/✓ przyciskami, filtruje do [0-9+-x]
      FigureInput.tsx      — input tylko cyfry [0-9]
```

## Rules

- **Scoring symmetry** — serwer i klient mają identyczne funkcje scoringowe. Zmiana w jednym → zmień w drugim
- **Kategorie po polsku** — nazwy w `categories.ts`, nie zmieniaj bez aktualizacji tools/ (ElevenLabs)
- **8 kolorów graczy** — `PLAYER_COLORS` w `categories.ts`, indeksowane modulo
- **Wypełnione pola** — input dostaje `filledColor` (kolor gracza z 12% opacity) jako tło
- **Input validation** — Szkoła: `[0-9+-xX]`, Figury: `[0-9]` only. Filtrowane na wejściu
- **Admin mode** — host może edytować dowolną komórkę. W trybie lokalnym domyślnie ON
- **Column reorder** — drag-and-drop + strzałki ◀/▶, tylko widok (nie zmienia serwer state)
- **Flash animation** — remote updates triggerują CSS `.flash` na inpucie
- **Mini-scoreboard** — wyniki innych graczy ukryte do `isAllComplete()`

## Dodawanie nowej kategorii

1. Dodaj do `SCHOOL_CATEGORIES` lub `FIGURE_CATEGORIES` w `categories.ts`
2. Aktualizuj server-side tablice w `state.ts`
3. Zaktualizuj `isRoundComplete()` i `isAllComplete()` (automatycznie bo iterują po tablicach)

## TypeScript Check

```bash
npx tsc --noEmit -p games/yahtzee/tsconfig.json
```
