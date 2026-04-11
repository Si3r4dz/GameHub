import type { TranslationMap } from '../types.js';

export const en: TranslationMap = {
  // Game configs
  'game.yahtzee.name': 'Yahtzee',
  'game.yahtzee.description': 'Classic dice game — school and figures',
  'game.quiz.name': 'Quiz',
  'game.quiz.description': 'Multiplayer quiz — answer against the clock!',

  // Common
  'common.loading': 'Loading...',
  'common.back': '← Back',
  'common.add': 'Add',
  'common.delete': 'Delete',
  'common.cancel': 'Cancel',
  'common.join': 'Join',
  'common.players': 'Players',
  'common.player': 'Player',
  'common.noGames': 'No games available',
  'common.newGame': 'New game',
  'common.pts': 'pts',

  // Connection
  'connection.connected': 'Connected',
  'connection.connecting': 'Connecting...',
  'connection.disconnected': 'Disconnected',

  // Launcher
  'launcher.gameNightMulti': 'Game Night (multiplayer)',
  'launcher.gameNightMultiDesc': 'Players scan QR once, play multiple games',
  'launcher.gameNightLocal': 'Game Night (local)',
  'launcher.gameNightLocalDesc': 'One screen, add players once, play multiple games',
  'launcher.quickGame': 'Quick Game',
  'launcher.quickGameDesc': 'Single game, classic mode',
  'launcher.multiPlayer': 'Multiplayer (phones)',
  'launcher.multiPlayerDesc': 'Players join via QR code',
  'launcher.localGame': 'Local game',
  'launcher.localGameDesc': 'One screen, game master manages everything',

  // Lobby
  'lobby.title': 'Lobby',
  'lobby.localGame': 'Local game',
  'lobby.addPlayer': 'Add player',
  'lobby.playerNamePlaceholder': 'Player name...',
  'lobby.addPlayerError': 'Failed to add player',
  'lobby.rounds': 'Number of rounds',
  'lobby.startGame': 'Start game ({count} players)',

  // Join
  'join.title': 'Join game',
  'join.yourName': 'Your name',
  'join.namePlaceholder': 'Enter name...',
  'join.error': 'Failed to join',
  'join.waiting': 'Waiting for game to start...',

  // Hub
  'hub.title': 'GameHub',
  'hub.addPlayer': 'Add player',
  'hub.playerNamePlaceholder': 'Player name...',
  'hub.addPlayerError': 'Failed to add player',
  'hub.createGameError': 'Failed to create game',
  'hub.playersCount': 'Players ({count})',
  'hub.waitingForPlayers': 'Waiting for players — let them scan the QR code',
  'hub.addPlayersHint': 'Add players above',
  'hub.removePlayer': 'Remove player',
  'hub.chooseGame': 'Choose a game',
  'hub.creatingGame': 'Creating game...',
  'hub.gameHistory': 'Game history',
  'hub.returnToHub': 'Return to GameHub',

  // Hub Join
  'hubJoin.title': 'Join GameHub',
  'hubJoin.yourName': 'Your name',
  'hubJoin.namePlaceholder': 'Enter name...',
  'hubJoin.error': 'Failed to join',

  // Hub Lobby (player waiting)
  'hubLobby.waiting': 'Waiting for game to start...',
  'hubLobby.played': 'Played',

  // Game page
  'game.loading': 'Loading game...',

  // Errors (server error codes)
  'error.gameNotFound': 'Game not found',
  'error.hubNotFound': 'Hub not found',
  'error.invalidToken': 'Invalid token',
  'error.noToken': 'No token provided',
  'error.unknownGameType': 'Unknown game type',
  'error.nameRequired': 'Please enter a name',
  'error.nameTaken': 'That name is already taken',
  'error.maxPlayers': 'Maximum {count} players',
  'error.hostOnly': 'Only the host can do this',
  'error.hostOnlyRemove': 'Only the host can remove players',
  'error.hostOnlyCreate': 'Only the host can create games',
  'error.gameInProgress': 'A game is already in progress',
  'error.noPlayers': 'No players',
  'error.playerNotFound': 'Player not found',
  'error.mustBePlayer': 'You must be a player',
};
