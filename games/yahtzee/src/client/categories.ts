// Category IDs — used as keys in game state. Do NOT change these.
export const SCHOOL_CATEGORIES = [
  'Jedynki (1)',
  'Dwójki (2)',
  'Trójki (3)',
  'Czwórki (4)',
  'Piątki (5)',
  'Szóstki (6)',
];

export const FIGURE_CATEGORIES = [
  'Jedna para',
  'Dwie pary',
  'Trójka',
  'Kareta',
  'Full',
  'Mały street',
  'Duży street',
  'Generał',
  'Nieparzyste',
  'Parzyste',
  'Losowe',
];

// Mapping from category ID → i18n key
export const CATEGORY_I18N_KEYS: Record<string, string> = {
  'Jedynki (1)': 'yahtzee.cat.ones',
  'Dwójki (2)': 'yahtzee.cat.twos',
  'Trójki (3)': 'yahtzee.cat.threes',
  'Czwórki (4)': 'yahtzee.cat.fours',
  'Piątki (5)': 'yahtzee.cat.fives',
  'Szóstki (6)': 'yahtzee.cat.sixes',
  'Jedna para': 'yahtzee.cat.onePair',
  'Dwie pary': 'yahtzee.cat.twoPairs',
  'Trójka': 'yahtzee.cat.threeOfKind',
  'Kareta': 'yahtzee.cat.fourOfKind',
  'Full': 'yahtzee.cat.fullHouse',
  'Mały street': 'yahtzee.cat.smallStraight',
  'Duży street': 'yahtzee.cat.largeStraight',
  'Generał': 'yahtzee.cat.yahtzee',
  'Nieparzyste': 'yahtzee.cat.odds',
  'Parzyste': 'yahtzee.cat.evens',
  'Losowe': 'yahtzee.cat.chance',
};

export const PLAYER_COLORS = [
  { bg: '#3b82f6', light: '#dbeafe' },
  { bg: '#ef4444', light: '#fee2e2' },
  { bg: '#22c55e', light: '#dcfce7' },
  { bg: '#f59e0b', light: '#fef3c7' },
  { bg: '#8b5cf6', light: '#ede9fe' },
  { bg: '#ec4899', light: '#fce7f3' },
  { bg: '#14b8a6', light: '#ccfbf1' },
  { bg: '#f97316', light: '#ffedd5' },
];
