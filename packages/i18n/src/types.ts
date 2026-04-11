export type Locale = 'pl' | 'en';

export type TranslationMap = Record<string, string>;

export type TFunction = (key: string, params?: Record<string, string | number>) => string;
