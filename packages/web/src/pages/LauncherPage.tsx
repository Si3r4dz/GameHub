import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameConfig, HubMode } from '@gamehub/core';
import { GameTile } from '../components/GameTile';

type View = 'main' | 'quick-game' | 'quick-mode';

export function LauncherPage() {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('main');
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/game-types')
      .then((r) => r.json())
      .then((data: GameConfig[]) => {
        setGames(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const createHub = async (mode: HubMode) => {
    const res = await fetch('/api/hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (data.hubId) {
      sessionStorage.setItem('gamehub_hubId', data.hubId);
      sessionStorage.setItem('gamehub_hub_token', data.hostToken);
      navigate(`/hub/${data.hubId}`);
    }
  };

  const createQuickGame = async (gameType: string, local: boolean) => {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType }),
    });
    const data = await res.json();
    if (data.gameId) {
      sessionStorage.setItem('gamehub_gameId', data.gameId);
      sessionStorage.setItem('gamehub_token', data.hostToken);
      if (local) {
        sessionStorage.setItem('gamehub_local', 'true');
        navigate(`/game/${data.gameId}?local=true`);
      } else {
        sessionStorage.removeItem('gamehub_local');
        navigate(`/game/${data.gameId}`);
      }
    }
  };

  // Quick game: mode selection (multiplayer/local)
  if (view === 'quick-mode' && selectedGame) {
    return (
      <div className="screen">
        <h1>{selectedGame.icon} {selectedGame.name}</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 24 }}>
          {selectedGame.description}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => createQuickGame(selectedGame.id, false)}
            style={{ padding: '16px 20px' }}
          >
            📱 Multiplayer (telefony)
            <br />
            <span style={{ fontSize: '.8rem', fontWeight: 400, opacity: .7 }}>
              Gracze dołączają przez QR code
            </span>
          </button>
          <button
            className="btn-primary"
            onClick={() => createQuickGame(selectedGame.id, true)}
            style={{ padding: '16px 20px', background: '#059669' }}
          >
            🖥️ Lokalna gra
            <br />
            <span style={{ fontSize: '.8rem', fontWeight: 400, opacity: .7 }}>
              Jeden ekran, game master zarządza wszystkim
            </span>
          </button>
          <button
            onClick={() => { setView('quick-game'); setSelectedGame(null); }}
            style={{ background: 'none', color: '#6b7280', fontSize: '.9rem' }}
          >
            ← Wróć
          </button>
        </div>
      </div>
    );
  }

  // Quick game: select game type
  if (view === 'quick-game') {
    return (
      <div>
        <h1>Szybka gra</h1>
        {games.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>Brak gier</p>
        ) : (
          <div className="launcher-grid">
            {games.map((g) => (
              <GameTile
                key={g.id}
                config={g}
                onClick={() => { setSelectedGame(g); setView('quick-mode'); }}
              />
            ))}
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => setView('main')}
            style={{ background: 'none', color: '#6b7280', fontSize: '.9rem' }}
          >
            ← Wróć
          </button>
        </div>
      </div>
    );
  }

  // Main screen
  return (
    <div className="screen">
      <h1>GameHub</h1>
      {loading ? (
        <p style={{ textAlign: 'center' }}>Ładowanie...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => createHub('multiplayer')}
            style={{ padding: '16px 20px' }}
          >
            📱 Wieczór gier (multiplayer)
            <br />
            <span style={{ fontSize: '.8rem', fontWeight: 400, opacity: .7 }}>
              Gracze skanują QR raz, grają wiele gier
            </span>
          </button>
          <button
            className="btn-primary"
            onClick={() => createHub('local')}
            style={{ padding: '16px 20px', background: '#059669' }}
          >
            🖥️ Wieczór gier (lokalnie)
            <br />
            <span style={{ fontSize: '.8rem', fontWeight: 400, opacity: .7 }}>
              Jeden ekran, dodaj graczy raz, graj wiele gier
            </span>
          </button>
          <button
            onClick={() => setView('quick-game')}
            style={{
              padding: '12px 20px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Szybka gra
            <br />
            <span style={{ fontSize: '.8rem', fontWeight: 400, color: '#6b7280' }}>
              Jedna gra, klasyczny tryb
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
