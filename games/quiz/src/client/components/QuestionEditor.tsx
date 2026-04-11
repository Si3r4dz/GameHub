import { useState } from 'react';
import { useT, useLocale } from '@gamehub/i18n';
import type { Question } from '../types';
import { sampleSets } from '../../data/sample-sets';

interface QuestionEditorProps {
  questions: Question[];
  timeLimit: number;
  onConfigure: (questions: Question[], timeLimit: number) => void;
  onStart: () => void;
}

export function QuestionEditor({
  questions,
  timeLimit,
  onConfigure,
  onStart,
}: QuestionEditorProps) {
  const t = useT();
  const { locale } = useLocale();
  const localeSets = sampleSets[locale] ?? sampleSets['pl'] ?? [];
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
  const [localTimeLimit, setLocalTimeLimit] = useState(timeLimit);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrect, setNewCorrect] = useState(0);

  const sync = (qs: Question[], tl?: number) => {
    setLocalQuestions(qs);
    onConfigure(qs, tl ?? localTimeLimit);
  };

  const loadSet = (setId: string) => {
    const set = localeSets.find((s) => s.id === setId);
    if (!set) return;
    const qs = set.questions.map((q, i) => ({
      id: `${setId}-${i}`,
      ...q,
    }));
    sync(qs);
  };

  const addQuestion = () => {
    if (!newText.trim() || newOptions.some((o) => !o.trim())) return;
    const q: Question = {
      id: `custom-${Date.now()}`,
      text: newText.trim(),
      options: newOptions.map((o) => o.trim()) as [string, string, string, string],
      correctIndex: newCorrect,
    };
    sync([...localQuestions, q]);
    setNewText('');
    setNewOptions(['', '', '', '']);
    setNewCorrect(0);
    setShowAddForm(false);
  };

  const removeQuestion = (id: string) => {
    sync(localQuestions.filter((q) => q.id !== id));
  };

  const handleTimeLimitChange = (val: number) => {
    setLocalTimeLimit(val);
    onConfigure(localQuestions, val);
  };

  const handleJsonImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const qs = (Array.isArray(data) ? data : data.questions ?? []).map(
          (q: Record<string, unknown>, i: number) => ({
            id: `import-${i}`,
            text: String(q.text ?? ''),
            options: (q.options as string[])?.slice(0, 4) ?? ['', '', '', ''],
            correctIndex: Number(q.correctIndex ?? 0),
          }),
        );
        sync(qs);
      } catch {
        alert(t('quiz.editor.jsonError'));
      }
    };
    input.click();
  };

  return (
    <div className="quiz-editor">
      <h1 style={{ textAlign: 'center', marginBottom: 16 }}>{t('quiz.editor.title')}</h1>

      {/* Load preset */}
      <select
        className="quiz-set-select"
        defaultValue=""
        onChange={(e) => loadSet(e.target.value)}
      >
        <option value="" disabled>
          {t('quiz.editor.loadPreset')}
        </option>
        {localeSets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({t('quiz.editor.questionsCount', { count: s.questions.length })})
          </option>
        ))}
      </select>

      {/* Time limit */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
          {t('quiz.editor.timeLimit', { seconds: localTimeLimit })}
        </label>
        <input
          type="range"
          min={5}
          max={60}
          value={localTimeLimit}
          onChange={(e) => handleTimeLimitChange(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Question list */}
      {localQuestions.map((q, i) => (
        <div key={q.id} className="quiz-editor-item">
          <div className="q-text">
            {i + 1}. {q.text}
          </div>
          <div className="q-options">
            {q.options.map((opt, j) => (
              <span key={j}>
                {j === q.correctIndex ? (
                  <span className="q-correct">
                    {['A', 'B', 'C', 'D'][j]}: {opt}
                  </span>
                ) : (
                  <span>
                    {['A', 'B', 'C', 'D'][j]}: {opt}
                  </span>
                )}
                {j < 3 ? ' | ' : ''}
              </span>
            ))}
          </div>
          <div className="quiz-editor-actions">
            <button className="delete" onClick={() => removeQuestion(q.id)}>
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {/* Add form */}
      {showAddForm ? (
        <div className="quiz-add-form">
          <label>{t('quiz.editor.questionLabel')}</label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t('quiz.editor.questionPlaceholder')}
          />
          {['A', 'B', 'C', 'D'].map((label, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="correct"
                checked={newCorrect === i}
                onChange={() => setNewCorrect(i)}
              />
              <label style={{ minWidth: 20, fontWeight: 700 }}>{label}</label>
              <input
                value={newOptions[i]}
                onChange={(e) => {
                  const opts = [...newOptions];
                  opts[i] = e.target.value;
                  setNewOptions(opts);
                }}
                placeholder={t('quiz.editor.optionPlaceholder', { label })}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={addQuestion}>
              {t('quiz.editor.addQuestionBtn')}
            </button>
            <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => setShowAddForm(true)}
          >
            {t('quiz.editor.addQuestion')}
          </button>
          <button
            onClick={handleJsonImport}
            style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
          >
            {t('quiz.editor.importJson')}
          </button>
        </div>
      )}

      {/* Start */}
      <button
        className="btn-primary"
        onClick={onStart}
        disabled={localQuestions.length === 0}
        style={{ marginTop: 16, padding: '14px 20px', fontSize: '1.1rem' }}
      >
        {t('quiz.editor.startQuiz', { count: localQuestions.length })}
      </button>
    </div>
  );
}
