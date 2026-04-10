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
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  icon: string;
  color: string;
}

export interface GameSession {
  id: string;
  gameType: string;
  players: ServerPlayer[];
  gameState: unknown;
  hostToken: string;
  hostSocketId: string | null;
  hostConnected: boolean;
  phase: GamePhase;
  createdAt: Date;
  hubId?: string;
}

// --- Hub types ---

export type HubMode = 'multiplayer' | 'local';

export interface HubSession {
  id: string;
  mode: HubMode;
  hostToken: string;
  hostSocketId: string | null;
  hostConnected: boolean;
  players: HubPlayer[];
  activeGameId: string | null;
  gameHistory: GameHistoryEntry[];
  createdAt: Date;
}

export interface HubPlayer {
  id: string;
  name: string;
  token: string;
  socketId: string | null;
  connected: boolean;
}

export interface GameHistoryEntry {
  gameId: string;
  gameType: string;
  gameName: string;
  finishedAt: Date;
  playerNames: string[];
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
