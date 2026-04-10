const SCHOOL_CATEGORIES = [
  'Jedynki (1)', 'Dwójki (2)', 'Trójki (3)',
  'Czwórki (4)', 'Piątki (5)', 'Szóstki (6)',
];
const FIGURE_CATEGORIES = [
  'Jedna para', 'Dwie pary', 'Trójka', 'Kareta', 'Full',
  'Mały street', 'Duży street', 'Generał', 'Nieparzyste', 'Parzyste', 'Losowe',
];

export interface RoundTotals {
  school: number | null;
  figure: number | null;
  total: number | null;
}

export interface RoundData {
  values: Record<string, Record<number, string>>;
  totals: Record<number, RoundTotals>;
}

export interface YahtzeeState {
  currentRound: number;
  totalRounds: number;
  rounds: RoundData[];
  values: Record<string, Record<number, string>>;
}

export function createInitialState(): YahtzeeState {
  return {
    currentRound: 0,
    totalRounds: 1,
    rounds: [],
    values: {},
  };
}

export function reindexState(
  state: unknown,
  removedIndex: number,
): YahtzeeState {
  const s = state as YahtzeeState;

  const reindexValues = (vals: Record<string, Record<number, string>>) => {
    const result: Record<string, Record<number, string>> = {};
    for (const cat of Object.keys(vals)) {
      result[cat] = {};
      for (const [idxStr, val] of Object.entries(vals[cat])) {
        const idx = parseInt(idxStr, 10);
        if (idx < removedIndex) result[cat][idx] = val;
        else if (idx > removedIndex) result[cat][idx - 1] = val;
      }
    }
    return result;
  };

  const reindexTotals = (totals: Record<number, RoundTotals>) => {
    const result: Record<number, RoundTotals> = {};
    for (const [idxStr, val] of Object.entries(totals)) {
      const idx = parseInt(idxStr, 10);
      if (idx < removedIndex) result[idx] = val;
      else if (idx > removedIndex) result[idx - 1] = val;
    }
    return result;
  };

  return {
    ...s,
    values: reindexValues(s.values),
    rounds: s.rounds.map((r) => ({
      values: reindexValues(r.values),
      totals: reindexTotals(r.totals),
    })),
  };
}

export function serializeForClient(
  gameState: unknown,
  _isHost: boolean,
  _playerIndex: number | null,
): unknown {
  return gameState;
}

// --- Server-side scoring (mirrored from client) ---

function parseSchool(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = raw.trim().toLowerCase();
  if (s === 'x') return 0;
  if (/^[+-]\d+$/.test(s)) return parseInt(s, 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

function parseFigure(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = raw.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

export function calcSchoolSum(
  values: Record<string, Record<number, string>>,
  playerIdx: number,
): number | null {
  let sum = 0;
  let allFilled = true;
  for (const cat of SCHOOL_CATEGORIES) {
    const v = parseSchool(values[cat]?.[playerIdx]);
    if (v === null) { allFilled = false; continue; }
    sum += v;
  }
  if (!allFilled) return null;
  return (sum < 0 ? -100 : 100) + sum;
}

export function calcFigureSum(
  values: Record<string, Record<number, string>>,
  playerIdx: number,
): number | null {
  let sum = 0;
  let hasAny = false;
  for (const cat of FIGURE_CATEGORIES) {
    const v = parseFigure(values[cat]?.[playerIdx]);
    if (v !== null) { sum += v; hasAny = true; }
  }
  return hasAny ? sum : null;
}

export function calcTotal(
  values: Record<string, Record<number, string>>,
  playerIdx: number,
): number | null {
  const school = calcSchoolSum(values, playerIdx);
  const figures = calcFigureSum(values, playerIdx);
  if (school === null && figures === null) return null;
  return (school || 0) + (figures || 0);
}

export function isRoundComplete(
  state: YahtzeeState,
  playerCount: number,
): boolean {
  const allCats = [...SCHOOL_CATEGORIES, ...FIGURE_CATEGORIES];
  for (let i = 0; i < playerCount; i++) {
    for (const cat of allCats) {
      const raw = state.values[cat]?.[i];
      if (raw === undefined || raw === null || raw.toString().trim() === '')
        return false;
    }
  }
  return true;
}

export function freezeRound(
  state: YahtzeeState,
  playerCount: number,
): RoundData {
  const totals: Record<number, RoundTotals> = {};
  for (let i = 0; i < playerCount; i++) {
    totals[i] = {
      school: calcSchoolSum(state.values, i),
      figure: calcFigureSum(state.values, i),
      total: calcTotal(state.values, i),
    };
  }
  return {
    values: { ...state.values },
    totals,
  };
}
