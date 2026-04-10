# @gamehub/quiz

Quiz wielosobowy — pytania ABCD z timerem, punktacja za szybkość + poprawność.

## Exports

```
"."        → src/index.ts         (serverPlugin: GameServerPlugin)
"./client" → src/client/plugin.ts (clientPlugin: GameClientPlugin)
```

## Game State

```typescript
QuizState {
  phase: 'lobby-edit' | 'question' | 'results' | 'final'
  questions: Question[]          // lista pytań
  currentQuestionIndex: number
  timeLimit: number              // sekundy per pytanie (5-60)
  timeRemaining: number          // odliczanie (server-authoritative)
  resultsTimeRemaining: number   // odliczanie w fazie results (5s)
  answers: Record<playerIndex, PlayerAnswer>
  scores: Record<playerIndex, number>  // łączne
  questionResults: QuestionResult[]     // historia
}
```

## Flow

1. **lobby-edit** — host edytuje pytania, ładuje zestawy, ustawia czas
2. **question** — pytanie na ekranach, timer odlicza, gracze odpowiadają
3. **results** — poprawna odpowiedź, punkty, 5s countdown do następnego
4. **final** — ranking, podium 🥇🥈🥉, statystyki

## Timer

- **Server-authoritative** — `onTick()` hook dekrementuje `timeRemaining` co sekundę
- Broadcast `quiz:timer-tick` co sekundę do klientów
- Klient wyświetla `timeRemaining` z serwera (nie własny setInterval)
- Reconnect → klient dostaje aktualny `timeRemaining` od razu
- `timeRemaining === 0` → auto-advance do results
- `resultsTimeRemaining === 0` → auto-advance do next question lub final

## Punktacja

```
score = round(1000 * remainingTime / totalTime)  // poprawna
score = 0                                          // błędna lub brak
```

## Serializacja

- **question phase**: klient NIE widzi `correctIndex` (ukryte). Widzi tylko swoją odpowiedź
- **results/final**: klient widzi wszystko
- **Host** widzi zawsze wszystko

## Actions

| Action | Payload | Auth | Phase |
|--------|---------|------|-------|
| `configure` | `{ questions, timeLimit }` | Host | lobby-edit |
| `start-quiz` | `{}` | Host | lobby-edit |
| `answer` | `{ optionIndex }` | Player (own) | question |
| `skip-question` | `{}` | Host | question |
| `next-question` | `{}` | Auto/Host | results |

## Files

```
src/
  index.ts                          — serverPlugin export
  server/
    state.ts                        — QuizState types, scoring, serializeForClient
    handlers.ts                     — handleAction, validateAction
    tick.ts                         — onTick: timer countdown, auto-advance
  client/
    types.ts                        — client-side type mirrors
    plugin.ts                       — clientPlugin export
    HostView.tsx                    — pytanie + timer (duży ekran), edytor w lobby
    ControllerView.tsx              — 4 przyciski ABCD + timer + feedback
    QuizSummary.tsx                 — ranking + podium
    quiz.css                        — styles
    components/
      QuestionEditor.tsx            — edytor pytań + import JSON + gotowe zestawy
  data/
    sample-sets.ts                  — gotowe zestawy (wiedza ogólna, nauka, geografia PL)
```

## Gotowe zestawy pytań

- `general-knowledge` — Wiedza ogólna (10 pytań)
- `science` — Nauka i przyroda (10 pytań)
- `geography-poland` — Geografia Polski (8 pytań)
- `human-anatomy` — Anatomia człowieka (20 pytań)
- `cell-biology-genetics` — Biologia komórki i genetyka (20 pytań)
- `human-body-fun-facts` — Ciało ludzkie — ciekawostki (20 pytań)

## TypeScript Check

```bash
npx tsc --noEmit -p games/quiz/tsconfig.json
```
