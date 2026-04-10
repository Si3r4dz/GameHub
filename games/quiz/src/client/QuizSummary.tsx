import type { GameViewProps } from '@gamehub/core';
import type { QuizState } from './types';
import './quiz.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function QuizSummary({ gameState, players, isHost }: GameViewProps) {
  const state = gameState as QuizState | null;
  if (!state) return null;

  // Sort players by score descending
  const ranked = [...players].sort(
    (a, b) => (state.scores[b.index] ?? 0) - (state.scores[a.index] ?? 0),
  );

  // Stats per player
  const totalQuestions = state.questionResults.length;
  const correctCounts: Record<number, number> = {};
  for (const p of players) {
    let correct = 0;
    for (const qr of state.questionResults) {
      const answer = qr.answers[p.index];
      const question = state.questions[qr.questionIndex];
      if (answer && question && answer.optionIndex === question.correctIndex) {
        correct++;
      }
    }
    correctCounts[p.index] = correct;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Wyniki quizu</h1>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 24 }}>
        {totalQuestions} pytań
      </p>

      {/* Podium */}
      <div className="quiz-podium">
        {ranked.slice(0, 3).map((p, i) => (
          <div key={p.index} className="quiz-podium-item">
            <div className="medal">{MEDALS[i]}</div>
            <div className="name">{p.name}</div>
            <div className="score">{state.scores[p.index] ?? 0} pkt</div>
            <div style={{ fontSize: '.8rem', color: '#9ca3af', marginTop: 4 }}>
              {correctCounts[p.index]}/{totalQuestions} poprawnych
            </div>
          </div>
        ))}
      </div>

      {/* Full ranking */}
      {ranked.length > 3 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>#</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Gracz</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Punkty</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Poprawne</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.index}>
                <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{state.scores[p.index] ?? 0}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  {correctCounts[p.index]}/{totalQuestions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
            Nowa gra
          </button>
        </div>
      )}
    </div>
  );
}
