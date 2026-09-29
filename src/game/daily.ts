import { SCHEDULE, type ScheduledPuzzle } from "./words";

/**
 * Puzzle #1 is the calendar day 2026-09-24. Puzzles roll over at the player's local midnight, so
 * the same instant can be different puzzle numbers in different timezones.
 */
export const EPOCH_UTC = Date.UTC(2026, 8, 24);
const DAY_MS = 86_400_000;

export interface Puzzle extends ScheduledPuzzle {
  number: number;
}

export function puzzleNumberAt(now: Date = new Date()): number {
  // Map the local calendar date onto a UTC midnight so DST's 23- and 25-hour days still count as one.
  const localDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((localDay - EPOCH_UTC) / DAY_MS) + 1;
}

export function puzzleFor(number: number, schedule: readonly ScheduledPuzzle[] = SCHEDULE): Puzzle {
  if (schedule.length === 0) throw new Error("empty schedule");
  // Wrap around when the pool is exhausted; ((n mod len) + len) mod len keeps it positive.
  const idx = (((number - 1) % schedule.length) + schedule.length) % schedule.length;
  return { number, ...schedule[idx] };
}

export function todaysPuzzle(now: Date = new Date()): Puzzle {
  return puzzleFor(puzzleNumberAt(now));
}

export function msUntilNextPuzzle(now: Date = new Date()): number {
  const nextStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextStart.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
