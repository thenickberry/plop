export const HISTOGRAM_BUCKETS = 7; // extra guesses 0..5 and 6+

export interface Stats {
  games: number;
  wins: number;
  /** Sum of (guesses - best) over wins, for the average. */
  extraTotal: number;
  histogram: number[];
  currentStreak: number;
  bestStreak: number;
  /** Puzzle number of the most recent win, 0 if none. */
  lastWon: number;
  /** Puzzle number most recently played to completion (win or give-up). */
  lastPlayed: number;
}

export function emptyStats(): Stats {
  return {
    games: 0,
    wins: 0,
    extraTotal: 0,
    histogram: new Array(HISTOGRAM_BUCKETS).fill(0),
    currentStreak: 0,
    bestStreak: 0,
    lastWon: 0,
    lastPlayed: 0,
  };
}

export interface Outcome {
  puzzleNumber: number;
  won: boolean;
  /** guesses - best; ignored when not won. */
  extra: number;
}

/** Pure: returns a new Stats. Recording the same puzzle twice is a no-op. */
export function recordOutcome(stats: Stats, outcome: Outcome): Stats {
  if (outcome.puzzleNumber <= stats.lastPlayed) return stats;
  const next: Stats = { ...stats, histogram: [...stats.histogram] };
  next.games += 1;
  next.lastPlayed = outcome.puzzleNumber;
  if (!outcome.won) {
    next.currentStreak = 0;
    return next;
  }
  next.wins += 1;
  const extra = Math.max(0, outcome.extra);
  next.extraTotal += extra;
  next.histogram[Math.min(extra, HISTOGRAM_BUCKETS - 1)] += 1;
  next.currentStreak = stats.lastWon === outcome.puzzleNumber - 1 ? stats.currentStreak + 1 : 1;
  next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  next.lastWon = outcome.puzzleNumber;
  return next;
}

/** The streak shown today: a streak whose last win is older than yesterday has lapsed. */
export function displayedStreak(stats: Stats, todayNumber: number): number {
  return stats.lastWon >= todayNumber - 1 ? stats.currentStreak : 0;
}

export function averageExtra(stats: Stats): number | undefined {
  return stats.wins === 0 ? undefined : stats.extraTotal / stats.wins;
}
