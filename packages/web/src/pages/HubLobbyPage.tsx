import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@gamehub/i18n';
import { useSocket } from '../context/SocketContext';
import { useHubConnection } from '../hooks/useHubConnection';
import { useHubState } from '../hooks/useHubState';
import { ConnectionBar } from '../components/ConnectionBar';
import { useWakeLock } from '../hooks/useWakeLock';

export function HubLobbyPage() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const t = useT();
  const { status, connect } = useHubConnection(socket);
  const hub = useHubState(socket, hubId);
  useWakeLock();

  // Connect to hub
  useEffect(() => {
    if (!hubId) return;
    const token = sessionStorage.getItem('gamehub_hub_player_token');
    if (token) {
      connect(hubId, token);
    }
  }, [hubId, connect]);

  // Listen for game created → navigate to game
  useEffect(() => {
    const handler = (e: Event) => {
      const { gameId } = (e as CustomEvent).detail as { gameId: string };
      // Player token is reused from hub
      const token = sessionStorage.getItem('gamehub_hub_player_token')!;
      sessionStorage.setItem('gamehub_ctrl_gameId', gameId);
      sessionStorage.setItem('gamehub_ctrl_token', token);
      navigate(`/join/${gameId}/play`);
    };
    window.addEventListener('gamehub:hub-game-created', handler);
    return () => window.removeEventListener('gamehub:hub-game-created', handler);
  }, [navigate]);

  // Listen for game finished → stay here (already on lobby page)
  // The hub state updates automatically via useHubState

  return (
    <div className="screen">
      <ConnectionBar status={status} />
      <h2 style={{ textAlign: 'center', marginBottom: 12 }}>
        GameHub
      </h2>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 20 }}>
        {t('hubLobby.waiting')}
      </p>

      {/* Player list */}
      <div>
        <h3 style={{ marginBottom: 8 }}>
          {t('hub.playersCount', { count: hub.players.length })}
        </h3>
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
                  background: p.connected ? '#22c55e' : '#d1d5db',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 500 }}>{p.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Game history */}
      {hub.gameHistory.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8, color: '#6b7280' }}>{t('hubLobby.played')}</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {hub.gameHistory.map((h, i) => (
              <li
                key={i}
                style={{
                  padding: '6px 0',
                  fontSize: '.85rem',
                  color: '#6b7280',
                }}
              >
                {h.gameName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
