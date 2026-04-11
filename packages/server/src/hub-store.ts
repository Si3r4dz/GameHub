import crypto from 'crypto';
import type { HubSession, HubPlayer, HubMode, GameHistoryEntry } from '@gamehub/core';

export class HubStore {
  private hubs = new Map<string, HubSession>();

  private generateId(): string {
    return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  }

  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generatePlayerId(): string {
    return `P-${crypto.randomBytes(4).toString('hex')}`;
  }

  create(mode: HubMode): HubSession {
    const id = this.generateId();
    const hub: HubSession = {
      id,
      mode,
      hostToken: this.generateToken(),
      hostSocketId: null,
      hostConnected: false,
      players: [],
      activeGameId: null,
      gameHistory: [],
      createdAt: new Date(),
    };
    this.hubs.set(id, hub);
    return hub;
  }

  get(hubId: string): HubSession | undefined {
    return this.hubs.get(hubId);
  }

  addPlayer(
    hubId: string,
    name: string,
  ): { playerId: string; playerToken: string } | { error: string } {
    const hub = this.hubs.get(hubId);
    if (!hub) return { error: 'error.hubNotFound' };

    const trimmed = name.trim();
    if (!trimmed) return { error: 'error.nameRequired' };
    if (hub.players.length >= 8) return { error: 'error.maxPlayers' };

    const duplicate = hub.players.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return { error: 'error.nameTaken' };

    const player: HubPlayer = {
      id: this.generatePlayerId(),
      name: trimmed,
      token: this.generateToken(),
      socketId: null,
      connected: false,
    };
    hub.players.push(player);

    return { playerId: player.id, playerToken: player.token };
  }

  removePlayer(hubId: string, playerId: string): boolean {
    const hub = this.hubs.get(hubId);
    if (!hub) return false;

    const idx = hub.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return false;

    hub.players.splice(idx, 1);
    return true;
  }

  getPlayerByToken(hubId: string, token: string): HubPlayer | undefined {
    const hub = this.hubs.get(hubId);
    if (!hub) return undefined;
    return hub.players.find((p) => p.token === token);
  }

  setActiveGame(hubId: string, gameId: string | null): void {
    const hub = this.hubs.get(hubId);
    if (hub) hub.activeGameId = gameId;
  }

  addToHistory(hubId: string, entry: GameHistoryEntry): void {
    const hub = this.hubs.get(hubId);
    if (hub) hub.gameHistory.push(entry);
  }
}
