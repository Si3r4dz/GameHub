import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '@gamehub/i18n';
import { useSocket } from '../context/SocketContext';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useGameState } from '../hooks/useGameState';
import { ConnectionBar } from '../components/ConnectionBar';
import { PlayerList } from '../components/PlayerList';
import { QRDisplay } from '../components/QRDisplay';

export function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const t = useT();
  const { status, connect } = useSocketConnection(socket);
  const game = useGameState(socket, gameId);
  const [serverInfo, setServerInfo] = useState<{
    ip: string;
    port: number;
  } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [addError, setAddError] = useState('');
  const [totalRounds, setTotalRounds] = useState(1);

  const isLocal =
    searchParams.get('local') === 'true' ||
    sessionStorage.getItem('gamehub_local') === 'true';

  useEffect(() => {
    if (!isLocal) {
      fetch('/api/server-info')
        .then((r) => r.json())
        .then(setServerInfo);
    }
  }, [isLocal]);

  useEffect(() => {
    if (!gameId) return;
    const token = sessionStorage.getItem('gamehub_token');
    if (token) {
      connect(gameId, token);
    }
  }, [gameId, connect]);

  useEffect(() => {
    if (game.phase === 'playing' && gameId) {
      navigate(`/game/${gameId}/play`);
    }
  }, [game.phase, gameId, navigate]);

  const startGame = () => {
    game.sendAction('start', { totalRounds });
  };

  const addPlayer = async () => {
    if (!playerName.trim() || !gameId) return;
    setAddError('');
    const res = await fetch(`/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(t(data.error) || t('lobby.addPlayerError'));
      return;
    }
    setPlayerName('');
  };

  return (
    <div className="screen">
      <h1>{isLocal ? t('lobby.localGame') : t('lobby.title')}</h1>
      <ConnectionBar status={status} />

      {/* Multiplayer mode — show QR */}
      {!isLocal && serverInfo && gameId && (
        <QRDisplay
          gameId={gameId}
          serverIp={serverInfo.ip}
          serverPort={serverInfo.port}
        />
      )}

      {/* Local mode — add players manually */}
      {isLocal && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            {t('lobby.addPlayer')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder={t('lobby.playerNamePlaceholder')}
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

      <PlayerList players={game.players} />

      {/* Round selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          {t('lobby.rounds')}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={1}
            max={10}
            value={totalRounds}
            onChange={(e) => setTotalRounds(parseInt(e.target.value, 10))}
            style={{ flex: 1 }}
          />
          <span style={{ fontWeight: 700, fontSize: '1.2rem', minWidth: 30, textAlign: 'center' }}>
            {totalRounds}
          </span>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={startGame}
        disabled={game.players.length === 0}
      >
        {t('lobby.startGame', { count: game.players.length })}
      </button>
    </div>
  );
}
