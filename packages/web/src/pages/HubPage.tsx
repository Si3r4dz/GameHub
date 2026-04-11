import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameConfig } from '@gamehub/core';
import { useT, LanguageSwitcher } from '@gamehub/i18n';
import { useSocket } from '../context/SocketContext';
import { useHubConnection } from '../hooks/useHubConnection';
import { useHubState } from '../hooks/useHubState';
import { ConnectionBar } from '../components/ConnectionBar';
import { QRDisplay } from '../components/QRDisplay';
import { GameTile } from '../components/GameTile';

export function HubPage() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const t = useT();
  const { status, connect } = useHubConnection(socket);
  const hub = useHubState(socket, hubId);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [addError, setAddError] = useState('');
  const [creating, setCreating] = useState(false);

  // Connect to hub
  useEffect(() => {
    if (!hubId) return;
    const token = sessionStorage.getItem('gamehub_hub_token');
    if (token) {
      connect(hubId, token);
    }
  }, [hubId, connect]);

  // Load game types
  useEffect(() => {
    fetch('/api/game-types')
      .then((r) => r.json())
      .then(setGames)
      .catch(() => {});
  }, []);

  // Load server info for QR (multiplayer only)
  useEffect(() => {
    if (hub.mode !== 'multiplayer') return;
    fetch('/api/server-info')
      .then((r) => r.json())
      .then(setServerInfo);
  }, [hub.mode]);

  // Listen for game created → navigate to game
  useEffect(() => {
    const handler = (e: Event) => {
      const { gameId, config } = (e as CustomEvent).detail as {
        gameId: string;
        gameType: string;
        config?: Record<string, unknown>;
      };
      // Store hub context for return
      sessionStorage.setItem('gamehub_gameId', gameId);
      // Host token is reused from hub
      sessionStorage.setItem('gamehub_token', sessionStorage.getItem('gamehub_hub_token')!);
      if (hub.mode === 'local') {
        sessionStorage.setItem('gamehub_local', 'true');
      } else {
        sessionStorage.removeItem('gamehub_local');
      }
      // Go straight to game (skip lobby — players already added, game already started)
      navigate(`/game/${gameId}/play`);
    };
    window.addEventListener('gamehub:hub-game-created', handler);
    return () => window.removeEventListener('gamehub:hub-game-created', handler);
  }, [navigate, hub.mode]);

  // Listen for game finished → already on HubPage, just refresh state
  useEffect(() => {
    const handler = () => {
      // Hub state is updated by useHubState automatically
    };
    window.addEventListener('gamehub:hub-game-finished', handler);
    return () => window.removeEventListener('gamehub:hub-game-finished', handler);
  }, []);

  const addPlayer = async () => {
    if (!playerName.trim() || !hubId) return;
    setAddError('');
    const res = await fetch(`/api/hub/${hubId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || t('hub.addPlayerError'));
      return;
    }
    setPlayerName('');
  };

  const removePlayer = async (playerId: string) => {
    if (!hubId) return;
    const token = sessionStorage.getItem('gamehub_hub_token');
    await fetch(`/api/hub/${hubId}/players/${playerId}?token=${token}`, {
      method: 'DELETE',
    });
  };

  const createGame = async (gameType: string) => {
    if (!hubId || creating) return;
    setCreating(true);
    const token = sessionStorage.getItem('gamehub_hub_token');
    try {
      const res = await fetch(`/api/hub/${hubId}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Token': token!,
        },
        body: JSON.stringify({ gameType }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || t('hub.createGameError'));
      }
      // Navigation happens via hub:game-created event
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>{t('hub.title')}</h1>
        <LanguageSwitcher />
      </div>
      <ConnectionBar status={status} />

      {/* QR for multiplayer / Player input for local */}
      {hub.mode === 'multiplayer' && serverInfo && hubId && (
        <QRDisplay
          gameId={hubId}
          serverIp={serverInfo.ip}
          serverPort={serverInfo.port}
          joinPath={`/hub/${hubId}/join`}
        />
      )}

      {hub.mode === 'local' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            {t('hub.addPlayer')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder={t('hub.playerNamePlaceholder')}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: 6,
                fontSize: '1rem',
              }}
              autoFocus
            />
            <button
              onClick={addPlayer}
              disabled={!playerName.trim()}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('common.add')}
            </button>
          </div>
          {addError && (
            <p style={{ color: '#ef4444', fontSize: '.85rem', marginTop: 6 }}>
              {addError}
            </p>
          )}
        </div>
      )}

      {/* Player list */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>
          {t('hub.playersCount', { count: hub.players.length })}
        </h3>
        {hub.players.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '.9rem' }}>
            {hub.mode === 'multiplayer'
              ? t('hub.waitingForPlayers')
              : t('hub.addPlayersHint')}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {hub.players.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: p.connected || hub.mode === 'local' ? '#22c55e' : '#d1d5db',
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
                <button
                  onClick={() => removePlayer(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '2px 6px',
                  }}
                  title={t('hub.removePlayer')}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Game selection */}
      <h3 style={{ marginBottom: 8 }}>{t('hub.chooseGame')}</h3>
      {games.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>{t('common.loading')}</p>
      ) : (
        <div className="launcher-grid">
          {games.map((g) => (
            <GameTile
              key={g.id}
              config={g}
              onClick={() => createGame(g.id)}
            />
          ))}
        </div>
      )}
      {creating && (
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 8 }}>
          {t('hub.creatingGame')}
        </p>
      )}

      {/* Game history */}
      {hub.gameHistory.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8, color: '#6b7280' }}>{t('hub.gameHistory')}</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {hub.gameHistory.map((h, i) => (
              <li
                key={i}
                style={{
                  padding: '6px 0',
                  fontSize: '.85rem',
                  color: '#6b7280',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                {h.gameName} — {h.playerNames.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
