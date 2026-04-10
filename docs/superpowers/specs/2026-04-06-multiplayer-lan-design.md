# Multiplayer LAN Yahtzee — Design Spec

## Context

Obecna aplikacja to single-player tracker wynikow Yahtzee dzialajacy na jednym urzadzeniu. Chcemy przeksztalcic ja w gre multiplayer w sieci LAN, gdzie jeden urzadzenie (host) wyswietla pelna tablice wynikow, a gracze dolaczaja telefonami jako kontrolery do wpisywania swoich wynikow w real-time.

## Wymagania

- **LAN only** — serwer na laptopie, gracze na tym samym WiFi
- **Host + kontrolery** — laptop = pelna tablica, telefony = uproszczony widok per gracz
- **Dolaczanie przez QR** — host pokazuje QR code, gracz skanuje, wpisuje imie, dolacza
- **Real-time sync przez Socket.io** — zmiany natychmiast widoczne na wszystkich urzadzeniach
- **Voice agent wylaczony** na razie (ElevenLabs integracja zostaje w kodzie ale nieaktywna)

## Architektura

```
[Host Browser]  <--socket.io-->  [Node.js Server]  <--socket.io-->  [Phone 1]
                                       |                              [Phone 2]
                                       +-- in-memory game state        [Phone N]
```

### Nowe zaleznosci

- `socket.io` ^4.7.0 (serwer + klient auto-served)
- QR: `qrcode-generator` z CDN (~10KB)

## Model danych

```
Game {
  id: string,                    // 6-char kod (np. "A3F7K2")
  players: [{
    index: number,               // pozycja w tabeli (0-based)
    name: string,
    token: string,               // session token do reconnectu
    socketId: string | null,
    connected: boolean
  }],
  values: {                      // identyczna struktura jak obecny klient
    [category]: { [playerIndex]: string }
  },
  hostToken: string,
  hostSocketId: string | null,
  hostConnected: boolean,
  createdAt: Date
}
```

Stan gier trzymany w `Map<string, Game>` w pamieci serwera. Brak bazy danych — restart serwera = utrata gier (akceptowalne dla LAN).

## REST Endpoints

| Metoda | Sciezka | Opis |
|--------|---------|------|
| `POST` | `/api/games` | Host tworzy gre. Zwraca `{ gameId, hostToken }` |
| `POST` | `/api/games/:gameId/join` | Gracz dolacza. Body: `{ name }`. Zwraca `{ playerIndex, playerToken }` |
| `GET` | `/api/games/:gameId` | Stan gry (wymaga `token` query param) |
| `GET` | `/api/server-info` | Zwraca `{ ip, port }` do budowania QR URL |

## Socket.io Events

### Klient -> Serwer

| Event | Payload | Kto | Opis |
|-------|---------|-----|------|
| `game:connect` | `{ gameId, token }` | Wszyscy | Autentykacja + dolaczenie do pokoju |
| `score:update` | `{ gameId, category, playerIndex, value }` | Kontroler (swoja kolumne) / Host (admin) | Aktualizacja komorki |

### Serwer -> Klient

| Event | Payload | Kto | Opis |
|-------|---------|-----|------|
| `game:state` | Pelny stan gry | Requester | Przy connect/reconnect |
| `player:joined` | `{ playerIndex, name }` | Pokoj | Nowy gracz |
| `player:status` | `{ playerIndex, connected }` | Pokoj | Status polaczenia |
| `score:changed` | `{ category, playerIndex, value }` | Pokoj (bez sendera) | Zmiana komorki |
| `game:reset` | `{}` | Pokoj | Reset wynikow (akcja hosta) |

### Autoryzacja

Serwer sprawdza ze token powiazany z socketem odpowiada `playerIndex` w `score:update`. Host token moze edytowac kazda kolumne (tryb admina).

## Routing i tryby klienta

Jedna plik HTML, tryb wykrywany z URL:

- `/` — tryb hosta (tworzenie gry lub reconnect)
- `/join/:gameId` — tryb kontrolera (dolaczanie + widok gracza)

Express serwuje ten sam `index.html` dla obu sciezek.

```javascript
const MODE = window.location.pathname.startsWith('/join/') ? 'controller' : 'host';
```

## Widok Hosta

### Ekran tworzenia gry (zastepuje obecny start screen)
- Przycisk "Utworz gre"
- Po utworzeniu: QR code + URL + kod gry
- Lista dolaczonych graczy ze statusem (zielona/szara kropka)
- Przycisk "Rozpocznij gre" (przechodzi do tablicy)

### Tablica wynikow (rozszerzony obecny widok)
- Pelna tabela ze wszystkimi kolumnami (reuse istniejacego `renderTable()`)
- Status polaczenia przy nazwie gracza w naglowku
- Komorki domyslnie read-only. Toggle "Tryb admina" wlacza edycje
- Toolbar: "Nowa gra", "Resetuj pola", "Pokaz QR" (dla spoznionych)

### Aktualizacja DOM
Przy `score:changed` — **targeted update** zamiast pelnego re-renderu:
```javascript
function updateCellDOM(category, playerIndex, value) {
  const input = document.querySelector(
    `input.cell[data-cat="${CSS.escape(category)}"][data-player="${playerIndex}"]`
  );
  if (input && input !== document.activeElement) {
    input.value = value;
  }
  updateAllSums();
  updateFilledState();
}
```

## Widok Kontrolera (telefon gracza)

### Ekran dolaczania
- Pole na imie gracza
- Przycisk "Dolacz"
- Token zapisany w `sessionStorage`

### Widok wpisywania wynikow
Pionowa lista 17 kategorii w kartach, pogrupowana na Szkole i Figury:

```
+---------------------------+
| Yahtzee  [*] Jakub        |  <- naglowek ze statusem
+---------------------------+
| SZKOLA                     |
| Jedynki (1)  [+][ 5 ][x] |
| Dwojki (2)   [+][   ][x] |
| ...                        |
| Suma: +105                 |
+---------------------------+
| FIGURY                     |
| Jedna para   [  25  ]     |
| ...                        |
| Suma: 142                  |
+---------------------------+
| LACZNIE: 247               |
+---------------------------+
| [v Tabela wynikow]        |  <- mini-scoreboard
+---------------------------+
```

- Gracz edytuje tylko swoja kolumne
- Mini-scoreboard: zwijany widok z totalami wszystkich graczy (read-only)
- Duze touch targety, mobile-first

## QR Code

```html
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
```

URL w QR: `http://{LAN-IP}:{port}/join/{gameId}`

## Reconnection

1. Socket disconnect -> serwer ustawia `connected: false`, broadcast `player:status`
2. Host widzi czerwona kropke przy graczu
3. Socket.io auto-reconnect -> klient wysyla `game:connect` z tokenem z `sessionStorage`
4. Serwer re-asocjuje gracza, wysyla pelny `game:state`, broadcast `player:status { connected: true }`
5. Klient nadpisuje lokalny stan, re-renderuje

## Edge Cases

| Scenariusz | Obsluga |
|------------|---------|
| Gracz refreshuje telefon | Auto-reconnect przez token w sessionStorage |
| Host refreshuje | To samo — reconnect przez hostToken |
| Restart serwera | Gry utracone. Klienci widza "Gra nie istnieje" |
| Duplikat imienia | Serwer odrzuca z 400 |
| Nieistniejacy gameId | Strona "Nie znaleziono gry" |
| 8+ graczy | Serwer odrzuca (max 8) |
| Gracz zamyka tab | Zostaje jako disconnected. Host moze usunac |

## Fazy implementacji

### Faza 1: Serwer + Socket.io plumbing
- Dodac socket.io do server.js i package.json
- REST endpointy (create, join, state, server-info)
- In-memory game store
- Socket event handlers z autoryzacja

### Faza 2: Widok hosta
- Ekran tworzenia gry z QR kodem
- Podlaczyc istniejacy renderTable do socket events
- Status polaczenia graczy
- Komorki read-only + admin toggle

### Faza 3: Widok kontrolera
- Detekcja trybu z URL
- Ekran dolaczania
- Widok jednokolumnowy z wpisywaniem wynikow
- Mini-scoreboard

### Faza 4: Polish
- Reconnection UX (status bar, "Laczenie...")
- Animacja flash przy zmianach z serwera
- Opcja usuniecia odlaczonego gracza przez hosta

## Pliki do modyfikacji

- `server.js` — Socket.io, REST endpoints, game store, autoryzacja
- `index.html` — widok kontrolera, modyfikacje hosta, Socket.io klient, QR, mode detection
- `package.json` — dodanie socket.io

## Weryfikacja

1. `npm install && npm start`
2. Otworz localhost:3000 — host tworzy gre, widac QR
3. Zeskanuj QR telefonem (ten sam WiFi) — ekran dolaczania
4. Wpisz imie, dolacz — host widzi nowego gracza
5. Wpisz wynik na telefonie — host widzi zmiane natychmiast
6. Zablokuj telefon, odblokuj — reconnect, stan zachowany
7. Otworz drugi telefon — dolacz drugiego gracza, test rownoczesnych zmian
