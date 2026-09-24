import data from "../data/words.json";

export interface ScheduledPuzzle {
  word: string;
  par: number;
}

export const TARGET: string = data.target;
export const ACCEPTED: ReadonlySet<string> = new Set(data.accepted);
export const SCHEDULE: readonly ScheduledPuzzle[] = data.schedule;
