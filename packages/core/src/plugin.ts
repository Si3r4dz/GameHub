import type { Server, Socket } from 'socket.io';
import type { ComponentType } from 'react';
import type { GameConfig, GameSession, Player } from './types.js';

// === Server-side plugin ===

export interface GameServerPlugin {
  config: GameConfig;

  createInitialState(): unknown;

  /** Handle a game-specific action. Called by the platform after auth + validation. */
  handleAction(ctx: GameActionContext, action: string, payload: unknown): void;

  serializeForClient(
    gameState: unknown,
    isHost: boolean,
    playerIndex: number | null,
  ): unknown;

  resetState(session: GameSession): unknown;

  /** Called when the host starts the game. Plugin can configure state from start payload. */
  onGameStart?(payload: unknown, session: GameSession): void;

  /** Called every second for active games. Return true to trigger full state refresh to all clients. */
  onTick?(session: GameSession, broadcastToRoom: (event: string, data: unknown) => void): boolean | void;

  /** Reindex game state after a player is removed. Shift indices down for players above the removed index. */
  reindexState?(state: unknown, removedIndex: number): unknown;

  validateAction?(
    action: string,
    payload: unknown,
    session: GameSession,
    playerIndex: number | null,
    isHost: boolean,
  ): string | null;
}

export interface GameActionContext {
  session: GameSession;
  updateState: (mutator: (state: unknown) => unknown) => void;
  broadcastToRoom: (event: string, data: unknown) => void;
  broadcastToOthers: (event: string, data: unknown) => void;
  isHost: boolean;
  playerIndex: number | null;
}

// === Client-side plugin ===

export interface GameClientPlugin {
  config: GameConfig;
  HostView: ComponentType<GameViewProps>;
  ControllerView: ComponentType<GameViewProps>;
  SummaryView?: ComponentType<GameViewProps>;
  getMiniScoreboardData?: (
    gameState: unknown,
    players: Player[],
  ) => MiniScoreboardData;
}

export interface GameViewProps {
  gameId: string;
  players: Player[];
  gameState: unknown;
  playerIndex: number | null;
  isHost: boolean;
  onAction: (action: string, payload: unknown) => void;
}

export interface MiniScoreboardData {
  rows: Array<{
    label: string;
    values: (string | number | null)[];
    isTotal?: boolean;
  }>;
}
