import crypto from 'crypto';
import type { GameSession, ServerPlayer, GamePhase } from '@gamehub/core';

export class GameStore {
  private games = new Map<string, GameSession>();

  generateId(len = 6): string {
    return crypto.randomBytes(4).toString('hex').slice(0, len).toUpperCase();
  }

  generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  create(gameType: string, initialState: unknown): GameSession {
    const id = this.generateId();
    const hostToken = this.generateToken();
    const session: GameSession = {
      id,
      gameType,
      players: [],
      gameState: initialState,
      hostToken,
      hostSocketId: null,
      hostConnected: false,
      phase: 'lobby',
      createdAt: new Date(),
    };
    this.games.set(id, session);
    return session;
  }

  get(gameId: string): GameSession | undefined {
    return this.games.get(gameId);
  }

  delete(gameId: string): void {
    this.games.delete(gameId);
  }

  addPlayer(
    gameId: string,
    name: string,
    maxPlayers: number,
  ): { playerIndex: number; playerToken: string } | { error: string } {
    const session = this.games.get(gameId);
    if (!session) return { error: 'error.gameNotFound' };

    const trimmed = name.trim();
    if (!trimmed) return { error: 'error.nameRequired' };
    if (session.players.length >= maxPlayers)
      return { error: 'error.maxPlayers' };

    const duplicate = session.players.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return { error: 'error.nameTaken' };

    const playerToken = this.generateToken();
    const playerIndex = session.players.length;
    const player: ServerPlayer = {
      index: playerIndex,
      name: trimmed,
      token: playerToken,
      socketId: null,
      connected: false,
    };
    session.players.push(player);

    return { playerIndex, playerToken };
  }

  removePlayer(
    gameId: string,
    playerIndex: number,
    reindexState?: (state: unknown, removedIndex: number) => unknown,
  ): boolean {
    const session = this.games.get(gameId);
    if (!session) return false;

    const player = session.players[playerIndex];
    if (!player) return false;

    session.players.splice(playerIndex, 1);
    session.players.forEach((p: { index: number }, i: number) => (p.index = i));

    // Reindex game state via plugin callback
    if (reindexState) {
      session.gameState = reindexState(session.gameState, playerIndex);
    }

    return true;
  }

  updateGameState(
    gameId: string,
    mutator: (state: unknown) => unknown,
  ): void {
    const session = this.games.get(gameId);
    if (!session) return;
    session.gameState = mutator(session.gameState);
  }

  setPhase(gameId: string, phase: GamePhase): void {
    const session = this.games.get(gameId);
    if (session) session.phase = phase;
  }

  createFromHub(
    gameType: string,
    initialState: unknown,
    hubId: string,
    hubPlayers: Array<{ name: string; token: string }>,
    hostToken: string,
  ): GameSession {
    const id = this.generateId();
    const players: ServerPlayer[] = hubPlayers.map((hp, index) => ({
      index,
      name: hp.name,
      token: hp.token,
      socketId: null,
      connected: false,
    }));
    const session: GameSession = {
      id,
      gameType,
      players,
      gameState: initialState,
      hostToken,
      hostSocketId: null,
      hostConnected: false,
      phase: 'lobby',
      createdAt: new Date(),
      hubId,
    };
    this.games.set(id, session);
    return session;
  }
}
