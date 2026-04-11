import type { TranslationMap } from '@gamehub/i18n';

export const en: TranslationMap = {
  // Host — question phase
  'quiz.questionOf': 'Question {current} / {total}',
  'quiz.answeredCount': 'Answered: {count} / {total}',
  'quiz.skipCountdown': 'End countdown ⏩',

  // Host — results phase
  'quiz.questionResults': 'Question results',
  'quiz.correctAnswer': 'Correct answer:',
  'quiz.answersCount': '{count} answers',
  'quiz.nextQuestionIn': 'Next question in {seconds}s...',
  'quiz.next': 'Next ⏩',

  // Controller — lobby
  'quiz.waitingForQuiz': 'Waiting for quiz to start...',
  'quiz.questionsReady': '{count} questions prepared',

  // Controller — question
  'quiz.answerSent': 'Answer sent — wait for results',

  // Controller — results
  'quiz.timeout': 'Time\'s up — no answer',
  'quiz.correct': 'Correct! +{points} pts',
  'quiz.wrong': 'Wrong!',
  'quiz.totalScore': 'Total: {score} pts',

  // Summary
  'quiz.resultsTitle': 'Quiz results',
  'quiz.questionsPlayed': '{count} questions',
  'quiz.correctCount': '{correct}/{total} correct',
  'quiz.playerCol': 'Player',
  'quiz.pointsCol': 'Points',
  'quiz.correctCol': 'Correct',

  // Question Editor
  'quiz.editor.title': 'Question Editor',
  'quiz.editor.loadPreset': 'Load preset...',
  'quiz.editor.questionsCount': '{count} questions',
  'quiz.editor.timeLimit': 'Time per answer: {seconds}s',
  'quiz.editor.addQuestion': '+ Add question',
  'quiz.editor.importJson': 'Import JSON',
  'quiz.editor.questionLabel': 'Question',
  'quiz.editor.questionPlaceholder': 'Question text...',
  'quiz.editor.optionPlaceholder': 'Option {label}...',
  'quiz.editor.addQuestionBtn': 'Add question',
  'quiz.editor.startQuiz': 'Start quiz ({count} questions)',
  'quiz.editor.jsonError': 'Error loading JSON',
};
