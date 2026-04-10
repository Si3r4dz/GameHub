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
