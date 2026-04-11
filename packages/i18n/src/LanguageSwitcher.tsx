import { useLocale } from './context.js';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        onClick={() => setLocale('pl')}
        style={{
          padding: '4px 8px',
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          fontWeight: locale === 'pl' ? 700 : 400,
          background: locale === 'pl' ? '#2563eb' : '#e5e7eb',
          color: locale === 'pl' ? '#fff' : '#374151',
          fontSize: '.8rem',
        }}
      >
        PL
      </button>
      <button
        onClick={() => setLocale('en')}
        style={{
          padding: '4px 8px',
          borderRadius: 4,
          border: 'none',
          cursor: 'pointer',
          fontWeight: locale === 'en' ? 700 : 400,
          background: locale === 'en' ? '#2563eb' : '#e5e7eb',
          color: locale === 'en' ? '#fff' : '#374151',
          fontSize: '.8rem',
        }}
      >
        EN
      </button>
    </div>
  );
}
