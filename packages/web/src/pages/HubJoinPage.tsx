import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@gamehub/i18n';

export function HubJoinPage() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Check for existing session
  useEffect(() => {
    const savedHubId = sessionStorage.getItem('gamehub_hubId');
    const savedToken = sessionStorage.getItem('gamehub_hub_player_token');
    if (savedHubId === hubId && savedToken) {
      navigate(`/hub/${hubId}/lobby`);
    }
  }, [hubId, navigate]);

  const handleJoin = async () => {
    if (!name.trim() || !hubId) return;
    setError('');

    const res = await fetch(`/api/hub/${hubId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(t(data.error) || t('hubJoin.error'));
      return;
    }

    sessionStorage.setItem('gamehub_hubId', hubId);
    sessionStorage.setItem('gamehub_hub_player_token', data.playerToken);
    sessionStorage.setItem('gamehub_hub_player_id', data.playerId);
    navigate(`/hub/${hubId}/lobby`);
  };

  return (
    <div className="screen">
      <h1>{t('hubJoin.title')}</h1>
      <div style={{ marginTop: 16 }}>
        <label htmlFor="name">{t('hubJoin.yourName')}</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder={t('hubJoin.namePlaceholder')}
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
