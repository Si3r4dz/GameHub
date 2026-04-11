import { useState } from 'react';
import type { GameViewProps } from '@gamehub/core';
import { useT } from '@gamehub/i18n';
import type { QuizState, Question } from './types';
import { QuestionEditor } from './components/QuestionEditor';
import './quiz.css';

const OPTION_CLASSES = ['quiz-option-a', 'quiz-option-b', 'quiz-option-c', 'quiz-option-d'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function HostView({ gameState, players, onAction }: GameViewProps) {
  const t = useT();
  const state = gameState as QuizState | null;
  if (!state) return <div style={{ textAlign: 'center', padding: 40 }}>{t('common.loading')}</div>;

  // Lobby-edit phase: question editor
  if (state.phase === 'lobby-edit') {
    return (
      <QuestionEditor
        questions={state.questions}
        timeLimit={state.timeLimit}
        onConfigure={(questions, timeLimit) => onAction('configure', { questions, timeLimit })}
        onStart={() => onAction('start-quiz', {})}
      />
    );
  }

  const question = state.questions[state.currentQuestionIndex];
  const answerCount = (state as unknown as Record<string, unknown>)?._answerCount as number
    ?? Object.keys(state.answers).length;

  // Question phase
  if (state.phase === 'question' && question) {
    return (
      <div className="quiz-host">
        <div className="quiz-progress">
          {t('quiz.questionOf', { current: state.currentQuestionIndex + 1, total: state.questions.length })}
        </div>
        <div className={`quiz-timer${state.timeRemaining <= 5 ? ' urgent' : ''}`}>
          {state.timeRemaining}
        </div>
        <div className="quiz-question-text">{question.text}</div>
        <div className="quiz-options-host">
          {question.options.map((opt, i) => (
            <div key={i} className={`quiz-option-host ${OPTION_CLASSES[i]}`}>
              <strong>{OPTION_LABELS[i]}.</strong> {opt}
            </div>
          ))}
        </div>
        <div className="quiz-answer-count">
          {t('quiz.answeredCount', { count: answerCount, total: players.length })}
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => onAction('skip-question', {})} style={{ background: '#e5e7eb', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', border: 'none', fontWeight: 600 }}>
            {t('quiz.skipCountdown')}
          </button>
        </div>
      </div>
    );
  }

  // Results phase
  if (state.phase === 'results' && question) {
    return (
      <div className="quiz-host">
        <div className="quiz-results-header">{t('quiz.questionResults')}</div>
        <div className="quiz-question-text" style={{ fontSize: '1.3rem' }}>{question.text}</div>
        <div className="quiz-correct-answer">
          {t('quiz.correctAnswer')} {OPTION_LABELS[question.correctIndex]}. {question.options[question.correctIndex]}
        </div>
        <div className="quiz-options-host">
          {question.options.map((opt, i) => {
            const count = Object.values(state.answers).filter((a) => a.optionIndex === i).length;
            return (
              <div
                key={i}
                className={`quiz-option-host ${OPTION_CLASSES[i]}${i === question.correctIndex ? ' correct' : ''}`}
              >
                <strong>{OPTION_LABELS[i]}.</strong> {opt}
                <br />
                <span style={{ fontSize: '.85rem', opacity: .8 }}>{t('quiz.answersCount', { count })}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span className="quiz-progress">
            {t('quiz.nextQuestionIn', { seconds: state.resultsTimeRemaining })}
          </span>
          <button onClick={() => onAction('next-question', {})} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', border: 'none', fontWeight: 600 }}>
            {t('quiz.next')}
          </button>
        </div>
      </div>
    );
  }

  // Final — handled by SummaryView
  return null;
}
