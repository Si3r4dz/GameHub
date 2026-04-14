import type { TranslationMap } from '../types.js';

export const pl: TranslationMap = {
  // Game configs
  'game.yahtzee.name': 'Yahtzee',
  'game.yahtzee.description': 'Klasyczna gra w kości — szkoła i figury',
  'game.quiz.name': 'Quiz',
  'game.quiz.description': 'Quiz wielosobowy — odpowiadaj na czas!',

  // Common
  'common.loading': 'Ładowanie...',
  'common.back': '← Wróć',
  'common.add': 'Dodaj',
  'common.delete': 'Usuń',
  'common.cancel': 'Anuluj',
  'common.join': 'Dołącz',
  'common.players': 'Gracze',
  'common.player': 'Gracz',
  'common.noGames': 'Brak dostępnych gier',
  'common.newGame': 'Nowa gra',
  'common.pts': 'pkt',

  // Connection
  'connection.connected': 'Połączono',
  'connection.connecting': 'Łączenie...',
  'connection.disconnected': 'Rozłączono',

  // Launcher
  'launcher.gameNightMulti': 'Wieczór gier (multiplayer)',
  'launcher.gameNightMultiDesc': 'Gracze skanują QR raz, grają wiele gier',
  'launcher.gameNightLocal': 'Wieczór gier (lokalnie)',
  'launcher.gameNightLocalDesc': 'Jeden ekran, dodaj graczy raz, graj wiele gier',
  'launcher.quickGame': 'Szybka gra',
  'launcher.quickGameDesc': 'Jedna gra, klasyczny tryb',
  'launcher.multiPlayer': 'Multiplayer (telefony)',
  'launcher.multiPlayerDesc': 'Gracze dołączają przez QR code',
  'launcher.localGame': 'Lokalna gra',
  'launcher.localGameDesc': 'Jeden ekran, game master zarządza wszystkim',

  // Lobby
  'lobby.title': 'Lobby',
  'lobby.localGame': 'Lokalna gra',
  'lobby.addPlayer': 'Dodaj gracza',
  'lobby.playerNamePlaceholder': 'Imię gracza...',
  'lobby.addPlayerError': 'Nie udało się dodać gracza',
  'lobby.rounds': 'Liczba rund',
  'lobby.startGame': 'Rozpocznij grę ({count} graczy)',

  // Join
  'join.title': 'Dołącz do gry',
  'join.yourName': 'Twoje imię',
  'join.namePlaceholder': 'Wpisz imię...',
  'join.error': 'Nie udało się dołączyć',
  'join.waiting': 'Oczekiwanie na rozpoczęcie gry...',

  // Hub
  'hub.title': 'GameHub',
  'hub.addPlayer': 'Dodaj gracza',
  'hub.playerNamePlaceholder': 'Imię gracza...',
  'hub.addPlayerError': 'Nie udało się dodać gracza',
  'hub.createGameError': 'Nie udało się utworzyć gry',
  'hub.playersCount': 'Gracze ({count})',
  'hub.waitingForPlayers': 'Czekam na graczy — niech zeskanują kod QR',
  'hub.addPlayersHint': 'Dodaj graczy powyżej',
  'hub.removePlayer': 'Usuń gracza',
  'hub.chooseGame': 'Wybierz grę',
  'hub.creatingGame': 'Tworzenie gry...',
  'hub.gameHistory': 'Historia gier',
  'hub.returnToHub': 'Wróć do GameHub',
  'hub.gameInProgress': 'Gra w toku',
  'hub.returnToGame': 'Wróć do gry',
  'hub.forceFinish': 'Zakończ grę',
  'hub.confirmForceFinish': 'Na pewno zakończyć trwającą grę?',

  // Hub Join
  'hubJoin.title': 'Dołącz do GameHub',
  'hubJoin.yourName': 'Twoje imię',
  'hubJoin.namePlaceholder': 'Wpisz imię...',
  'hubJoin.error': 'Nie udało się dołączyć',

  // Hub Lobby (player waiting)
  'hubLobby.waiting': 'Oczekiwanie na rozpoczęcie gry...',
  'hubLobby.played': 'Zagrane',

  // Game page
  'game.loading': 'Ładowanie gry...',

  // Errors (server error codes)
  'error.gameNotFound': 'Gra nie istnieje',
  'error.hubNotFound': 'Hub nie istnieje',
  'error.invalidToken': 'Nieprawidłowy token',
  'error.noToken': 'Brak tokenu',
  'error.unknownGameType': 'Nieznany typ gry',
  'error.nameRequired': 'Podaj imię',
  'error.nameTaken': 'To imię jest już zajęte',
  'error.maxPlayers': 'Maksymalnie {count} graczy',
  'error.hostOnly': 'Tylko host może to zrobić',
  'error.hostOnlyRemove': 'Tylko host może usuwać graczy',
  'error.hostOnlyCreate': 'Tylko host może tworzyć gry',
  'error.gameInProgress': 'Gra już trwa',
  'error.noPlayers': 'Brak graczy',
  'error.playerNotFound': 'Gracz nie istnieje',
  'error.mustBePlayer': 'Musisz być graczem',
};
