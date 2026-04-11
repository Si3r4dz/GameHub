import type { TranslationMap } from '@gamehub/i18n';

export const pl: TranslationMap = {
  // Host — question phase
  'quiz.questionOf': 'Pytanie {current} / {total}',
  'quiz.answeredCount': 'Odpowiedziało: {count} / {total}',
  'quiz.skipCountdown': 'Zakończ odliczanie ⏩',

  // Host — results phase
  'quiz.questionResults': 'Wyniki pytania',
  'quiz.correctAnswer': 'Poprawna odpowiedź:',
  'quiz.answersCount': '{count} odpowiedzi',
  'quiz.nextQuestionIn': 'Następne pytanie za {seconds}s...',
  'quiz.next': 'Dalej ⏩',

  // Controller — lobby
  'quiz.waitingForQuiz': 'Oczekiwanie na rozpoczęcie quizu...',
  'quiz.questionsReady': '{count} pytań przygotowanych',

  // Controller — question
  'quiz.answerSent': 'Odpowiedź wysłana — czekaj na wyniki',

  // Controller — results
  'quiz.timeout': 'Czas minął — brak odpowiedzi',
  'quiz.correct': 'Dobrze! +{points} pkt',
  'quiz.wrong': 'Źle!',
  'quiz.totalScore': 'Łącznie: {score} pkt',

  // Summary
  'quiz.resultsTitle': 'Wyniki quizu',
  'quiz.questionsPlayed': '{count} pytań',
  'quiz.correctCount': '{correct}/{total} poprawnych',
  'quiz.playerCol': 'Gracz',
  'quiz.pointsCol': 'Punkty',
  'quiz.correctCol': 'Poprawne',

  // Question Editor
  'quiz.editor.title': 'Edytor pytań',
  'quiz.editor.loadPreset': 'Załaduj gotowy zestaw...',
  'quiz.editor.questionsCount': '{count} pytań',
  'quiz.editor.timeLimit': 'Czas na odpowiedź: {seconds}s',
  'quiz.editor.addQuestion': '+ Dodaj pytanie',
  'quiz.editor.importJson': 'Import JSON',
  'quiz.editor.questionLabel': 'Pytanie',
  'quiz.editor.questionPlaceholder': 'Treść pytania...',
  'quiz.editor.optionPlaceholder': 'Opcja {label}...',
  'quiz.editor.addQuestionBtn': 'Dodaj pytanie',
  'quiz.editor.startQuiz': 'Rozpocznij quiz ({count} pytań)',
  'quiz.editor.jsonError': 'Błąd wczytywania JSON',
};
