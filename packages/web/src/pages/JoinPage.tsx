import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@gamehub/i18n';
import { useSocket } from '../context/SocketContext';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useGameState } from '../hooks/useGameState';
import { ConnectionBar } from '../components/ConnectionBar';
import { PlayerList } from '../components/PlayerList';

export function JoinPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const t = useT();
  const { status, connect } = useSocketConnection(socket);
  const game = useGameState(socket, gameId);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  // Check for existing session
  useEffect(() => {
    const savedGameId = sessionStorage.getItem('gamehub_ctrl_gameId');
    const savedToken = sessionStorage.getItem('gamehub_ctrl_token');
    if (savedGameId === gameId && savedToken) {
      connect(gameId!, savedToken);
      setJoined(true);
    }
  }, [gameId, connect]);

  useEffect(() => {
    if (joined && game.phase === 'playing' && gameId) {
      navigate(`/join/${gameId}/play`);
    }
  }, [joined, game.phase, gameId, navigate]);

  const handleJoin = async () => {
    if (!name.trim() || !gameId) return;
    setError('');

    const res = await fetch(`/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(t(data.error) || t('join.error'));
      return;
    }

    sessionStorage.setItem('gamehub_ctrl_gameId', gameId);
    sessionStorage.setItem('gamehub_ctrl_token', data.playerToken);
    sessionStorage.setItem('gamehub_ctrl_playerIndex', String(data.playerIndex));
    connect(gameId, data.playerToken);
    setJoined(true);
  };

  if (joined) {
    return (
      <div className="screen">
        <ConnectionBar status={status} />
        <h2 style={{ textAlign: 'center', marginBottom: 12 }}>
          {t('join.waiting')}
        </h2>
        <PlayerList players={game.players} />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>{t('join.title')}</h1>
      <div style={{ marginTop: 16 }}>
        <label htmlFor="name">{t('join.yourName')}</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder={t('join.namePlaceholder')}
          autoFocus
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: '.85rem', marginBottom: 8 }}>
            {error}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={!name.trim()}
        >
          {t('common.join')}
        </button>
      </div>
    </div>
  );
}

