import type { GameViewProps } from '@gamehub/core';
import { useT } from '@gamehub/i18n';
import type { QuizState } from './types';
import './quiz.css';

const OPTION_CLASSES = ['quiz-option-a', 'quiz-option-b', 'quiz-option-c', 'quiz-option-d'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function ControllerView({ gameState, playerIndex, players, onAction }: GameViewProps) {
  const t = useT();
  const state = gameState as QuizState | null;
  if (!state || playerIndex === null) {
    return <div style={{ textAlign: 'center', padding: 40 }}>{t('common.loading')}</div>;
  }

  const myName = players.find((p) => p.index === playerIndex)?.name ?? t('common.player');
  const myScore = state.scores[playerIndex] ?? 0;

  // Waiting in lobby
  if (state.phase === 'lobby-edit') {
    return (
      <div className="quiz-ctrl" style={{ textAlign: 'center', padding: 40 }}>
        <h2>{myName}</h2>
        <p style={{ color: '#6b7280', marginTop: 12 }}>{t('quiz.waitingForQuiz')}</p>
        <p style={{ marginTop: 8, fontSize: '.9rem', color: '#9ca3af' }}>
          {t('quiz.questionsReady', { count: state.questions.length })}
        </p>
      </div>
    );
  }

  const question = state.questions[state.currentQuestionIndex];
  // Check server-confirmed answer OR optimistic local answer
  const serverAnswer = state.answers[playerIndex];
  const localAnswer = (state as unknown as Record<string, unknown>)?._myAnswer as { optionIndex: number } | undefined;
  const myAnswer = serverAnswer ?? localAnswer;

  // Question phase
  if (state.phase === 'question' && question) {
    return (
      <div className="quiz-ctrl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>{myName}</span>
          <span style={{ fontSize: '.85rem', color: '#6b7280' }}>{myScore} pkt</span>
        </div>
        <div className="quiz-ctrl-question">{question.text}</div>
        <div className={`quiz-ctrl-timer${state.timeRemaining <= 5 ? ' urgent' : ''}`}>
          {state.timeRemaining}
        </div>
        <div className="quiz-ctrl-options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              className={`quiz-ctrl-option ${OPTION_CLASSES[i]}${myAnswer?.optionIndex === i ? ' selected' : ''}`}
              disabled={!!myAnswer}
              onClick={() => onAction('answer', { optionIndex: i })}
            >
              <strong>{OPTION_LABELS[i]}.</strong>&nbsp;{opt}
            </button>
          ))}
        </div>
        {myAnswer && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#6b7280', fontWeight: 600 }}>
            {t('quiz.answerSent')}
          </div>
        )}
      </div>
    );
  }

  // Results phase
  if (state.phase === 'results' && question) {
    const lastResult = state.questionResults[state.questionResults.length - 1];
    const pointsEarned = lastResult?.scores[playerIndex] ?? 0;
    const wasCorrect = myAnswer && myAnswer.optionIndex === question.correctIndex;
    const didNotAnswer = !myAnswer;

    return (
      <div className="quiz-ctrl">
        <div className="quiz-ctrl-question" style={{ fontSize: '1rem' }}>{question.text}</div>
        <div className="quiz-correct-answer">
          {OPTION_LABELS[question.correctIndex]}. {question.options[question.correctIndex]}
        </div>
        <div className={`quiz-ctrl-feedback ${didNotAnswer ? 'timeout' : wasCorrect ? 'correct' : 'wrong'}`}>
          {didNotAnswer
            ? t('quiz.timeout')
            : wasCorrect
              ? t('quiz.correct', { points: pointsEarned })
              : t('quiz.wrong')}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: '1.2rem', fontWeight: 700 }}>
          {t('quiz.totalScore', { score: myScore })}
        </div>
      </div>
    );
  }

  // Final — handled by SummaryView
  return null;
}
