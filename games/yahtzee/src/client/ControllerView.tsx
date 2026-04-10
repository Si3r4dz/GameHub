import { useState } from 'react';
import type { GameViewProps } from '@gamehub/core';
import type { YahtzeeState } from './types';
import { SCHOOL_CATEGORIES, FIGURE_CATEGORIES } from './categories';
import {
  calcSchoolSum,
  calcFigureSum,
  calcTotal,
  countFilled,
  isSchoolComplete,
  isAllComplete,
} from './scoring';
import { SchoolInput } from './components/SchoolInput';
import { FigureInput } from './components/FigureInput';
import './yahtzee.css';

export function ControllerView({
  players,
  gameState,
  playerIndex,
  onAction,
}: GameViewProps) {
  const state = gameState as YahtzeeState | null;
  const values = state?.values ?? {};
  const currentRound = state?.currentRound ?? 0;
  const totalRounds = state?.totalRounds ?? 1;
  const multiRound = totalRounds > 1;
  const [showMiniBoard, setShowMiniBoard] = useState(false);

  if (playerIndex === null) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Ładowanie...</div>;
  }

  const myName =
    players.find((p) => p.index === playerIndex)?.name ?? 'Gracz';

  const handleChange = (category: string, value: string) => {
    onAction('score:update', { category, playerIndex, value });
  };

  const schoolSum = calcSchoolSum(values, playerIndex);
  const figureSum = calcFigureSum(values, playerIndex);
  const total = calcTotal(values, playerIndex);
  const schoolFilled = countFilled(SCHOOL_CATEGORIES, values, playerIndex);
  const schoolComplete = isSchoolComplete(values, playerIndex);
  const figureFilled = countFilled(FIGURE_CATEGORIES, values, playerIndex);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="ctrl-header">
        <h2>{myName}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {multiRound && (
            <span style={{ fontWeight: 600, fontSize: '.85rem', color: '#6b7280' }}>
              Runda {currentRound + 1}/{totalRounds}
            </span>
          )}
          <span
            className={`th-status ${
              players.find((p) => p.index === playerIndex)?.connected
                ? 'on'
                : 'off'
            }`}
          />
        </div>
      </div>

      {/* School section */}
      <div className="ctrl-section">
        <div className="ctrl-section-title">Szkoła</div>
        {SCHOOL_CATEGORIES.map((cat) => (
          <div key={cat} className="ctrl-row">
            <span className="cat-name">{cat}</span>
            <SchoolInput
              value={values[cat]?.[playerIndex] ?? ''}
              onChange={(v) => handleChange(cat, v)}
            />
          </div>
        ))}
        <div className="ctrl-sum">
          Suma:{' '}
          {schoolSum !== null
            ? schoolComplete
              ? schoolSum
              : `(${schoolSum}) — ${schoolFilled}/6`
            : '—'}
        </div>
      </div>

      {/* Figure section */}
      <div className="ctrl-section">
        <div className="ctrl-section-title">Figury</div>
        {FIGURE_CATEGORIES.map((cat) => (
          <div key={cat} className="ctrl-row">
            <span className="cat-name">{cat}</span>
            <FigureInput
              value={values[cat]?.[playerIndex] ?? ''}
              onChange={(v) => handleChange(cat, v)}
            />
          </div>
        ))}
        <div className="ctrl-sum">
          Suma: {figureSum !== null ? `${figureSum} — ${figureFilled}/11` : '—'}
        </div>
      </div>

      {/* Total */}
      <div className="ctrl-total">ŁĄCZNIE: {total !== null ? total : '—'}</div>

      {/* Mini scoreboard — scores hidden until everyone finishes */}
      {(() => {
        const gameComplete = isAllComplete(values, players.length);
        return (
          <>
            <button
              className="mini-board-toggle"
              onClick={() => setShowMiniBoard(!showMiniBoard)}
            >
              {showMiniBoard ? '▲ Ukryj tabelę' : '▼ Tabela wyników'}
            </button>
            {showMiniBoard && (
              <div className="mini-board">
                {!gameComplete && (
                  <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.85rem', marginBottom: 8 }}>
                    Wyniki innych graczy pojawią się po zakończeniu gry
                  </p>
                )}
                <table>
                  <thead>
                    <tr>
                      <th>Gracz</th>
                      <th>Szkoła</th>
                      <th>Figury</th>
                      <th>Łącznie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => {
                      const isMe = p.index === playerIndex;
                      const showScores = isMe || gameComplete;
                      return (
                        <tr
                          key={p.index}
                          style={isMe ? { fontWeight: 700 } : undefined}
                        >
                          <td style={{ textAlign: 'left' }}>{p.name}</td>
                          <td>{showScores ? (calcSchoolSum(values, p.index) ?? '—') : '?'}</td>
                          <td>{showScores ? (calcFigureSum(values, p.index) ?? '—') : '?'}</td>
                          <td>{showScores ? (calcTotal(values, p.index) ?? '—') : '?'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
