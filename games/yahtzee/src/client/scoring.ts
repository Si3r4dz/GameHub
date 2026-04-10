import { SCHOOL_CATEGORIES, FIGURE_CATEGORIES } from './categories';

type Values = Record<string, Record<number, string>>;

export function parseSchool(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = raw.trim().toLowerCase();
  if (s === 'x') return 0;
  if (/^[+-]\d+$/.test(s)) return parseInt(s, 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

export function parseFigure(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = raw.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

export function calcSchoolSum(
  values: Values,
  playerIdx: number,
): number | null {
  let sum = 0;
  let allFilled = true;
  for (const cat of SCHOOL_CATEGORIES) {
    const v = parseSchool(values[cat]?.[playerIdx]);
    if (v === null) {
      allFilled = false;
      continue;
    }
    sum += v;
  }
  if (!allFilled) {
    let partial = 0;
    let hasAny = false;
    for (const cat of SCHOOL_CATEGORIES) {
      const v = parseSchool(values[cat]?.[playerIdx]);
      if (v !== null) {
        partial += v;
        hasAny = true;
      }
    }
    return hasAny ? partial : null;
  }
  return (sum < 0 ? -100 : 100) + sum;
}

export function isSchoolComplete(
  values: Values,
  playerIdx: number,
): boolean {
  for (const cat of SCHOOL_CATEGORIES) {
    if (parseSchool(values[cat]?.[playerIdx]) === null) return false;
  }
  return true;
}

export function calcFigureSum(
  values: Values,
  playerIdx: number,
): number | null {
  let sum = 0;
  let hasAny = false;
  for (const cat of FIGURE_CATEGORIES) {
    const v = parseFigure(values[cat]?.[playerIdx]);
    if (v !== null) {
      sum += v;
      hasAny = true;
    }
  }
  return hasAny ? sum : null;
}

export function calcTotal(
  values: Values,
  playerIdx: number,
): number | null {
  const school = calcSchoolSum(values, playerIdx);
  const figures = calcFigureSum(values, playerIdx);
  if (school === null && figures === null) return null;
  return (school || 0) + (figures || 0);
}

export function countFilled(
  categories: string[],
  values: Values,
  playerIdx: number,
): number {
  let count = 0;
  for (const cat of categories) {
    const raw = values[cat]?.[playerIdx];
    if (raw !== undefined && raw !== null && raw.toString().trim() !== '')
      count++;
  }
  return count;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function isAllComplete(
  values: Record<string, Record<number, string>>,
  playerCount: number,
): boolean {
  const allCats = [...SCHOOL_CATEGORIES, ...FIGURE_CATEGORIES];
  for (let i = 0; i < playerCount; i++) {
    for (const cat of allCats) {
      const raw = values[cat]?.[i];
      if (raw === undefined || raw === null || raw.toString().trim() === '')
        return false;
    }
  }
  return true;
}
