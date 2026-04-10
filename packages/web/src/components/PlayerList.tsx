import type { Player } from '@gamehub/core';

export function PlayerList({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '12px' }}>Oczekiwanie na graczy...</p>;
  }

  return (
    <ul className="player-list">
      {players.map((p) => (
        <li key={p.index}>
          <span className={`dot ${p.connected ? 'on' : 'off'}`} />
          {p.name}
        </li>
      ))}
    </ul>
  );
}
