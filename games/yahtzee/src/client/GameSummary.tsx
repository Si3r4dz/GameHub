import type { GameViewProps } from '@gamehub/core';
import { useT } from '@gamehub/i18n';
import type { YahtzeeState } from './types';
import './yahtzee.css';

export function GameSummary({
  gameState,
  players,
  isHost,
}: GameViewProps) {
  const t = useT();
  const state = gameState as YahtzeeState | null;
  const rounds = state?.rounds ?? [];

  if (rounds.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40 }}>{t('yahtzee.noData')}</div>;
  }

  // Calculate grand totals per player
  const grandTotals: Record<number, number> = {};
  for (const p of players) {
    let sum = 0;
    for (const round of rounds) {
      sum += round.totals[p.index]?.total ?? 0;
    }
    grandTotals[p.index] = sum;
  }

  // Find winner
  const maxTotal = Math.max(...Object.values(grandTotals));
  const winnerIndices = new Set(
    Object.entries(grandTotals)
      .filter(([, v]) => v === maxTotal)
      .map(([k]) => parseInt(k, 10)),
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>{t('yahtzee.gameSummary')}</h1>

      <div style={{ overflowX: 'auto' }}>
        <table className="summary-table">
          <thead>
            <tr>
              <th>{t('common.player')}</th>
              {rounds.map((_, i) => (
                <th key={i}>R{i + 1}</th>
              ))}
              <th style={{ background: '#d1fae5', fontWeight: 800 }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const isWinner = winnerIndices.has(p.index);
              return (
                <tr
                  key={p.index}
                  style={isWinner ? { background: '#fef3c7' } : undefined}
                >
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>
                    {isWinner && '🏆 '}{p.name}
                  </td>
                  {rounds.map((round, i) => (
                    <td key={i}>{round.totals[p.index]?.total ?? '—'}</td>
                  ))}
                  <td style={{ fontWeight: 800, background: '#d1fae5' }}>
                    {grandTotals[p.index]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isHost && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            className="btn-primary"
            onClick={() => {
              sessionStorage.removeItem('gamehub_gameId');
              sessionStorage.removeItem('gamehub_token');
              sessionStorage.removeItem('gamehub_local');
              window.location.href = '/';
            }}
            style={{ maxWidth: 300 }}
          >
            {t('common.newGame')}
          </button>
        </div>
      )}
    </div>
  );
}
