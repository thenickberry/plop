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

/**
 * Puzzle #6 could vanish unplayed for anyone east of UTC: the switch from UTC to local-midnight
 * rollover went live around 23:10 UTC on 2026-09-29, when their local date was already the 30th, so
 * they jumped straight from #6 to #7. Treat #5 -> #7 as consecutive so that jump never breaks a streak.
 */
const ROLLOVER_SWITCH_SKIPPED = 6;

/** Whether a win on `puzzleNumber` extends a streak whose last win was `lastWon`. */
function continuesStreak(lastWon: number, puzzleNumber: number): boolean {
  if (lastWon === puzzleNumber - 1) return true;
  return lastWon === ROLLOVER_SWITCH_SKIPPED - 1 && puzzleNumber === ROLLOVER_SWITCH_SKIPPED + 1;
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
  next.currentStreak = continuesStreak(stats.lastWon, outcome.puzzleNumber) ? stats.currentStreak + 1 : 1;
  next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  next.lastWon = outcome.puzzleNumber;
  return next;
}

/** The streak shown today: a streak whose last win is older than yesterday has lapsed. */
export function displayedStreak(stats: Stats, todayNumber: number): number {
  return stats.lastWon >= todayNumber - 1 || continuesStreak(stats.lastWon, todayNumber) ? stats.currentStreak : 0;
}

export function averageExtra(stats: Stats): number | undefined {
  return stats.wins === 0 ? undefined : stats.extraTotal / stats.wins;
}
