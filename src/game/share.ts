import { matches } from "./ladder";

export const GAME_NAME = "Plop";
export const MAX_SHARE_ROWS = 12;

export const TILE_HIT = "🟫";
export const TILE_MISS = "⬜";

export function emojiRow(word: string, target: string): string {
  return matches(word, target)
    .map((hit) => (hit ? TILE_HIT : TILE_MISS))
    .join("");
}

export interface ShareInput {
  number: number;
  /** Every word on the board, start word first, target last if solved. */
  words: readonly string[];
  target: string;
  best: number;
  gaveUp?: boolean;
}

export function shareText(input: ShareInput): string {
  const { number, words, target, best, gaveUp = false } = input;
  const guesses = words.length - 1;
  const score = gaveUp ? "X" : String(guesses);
  const rows = words.map((w) => emojiRow(w, target));
  const shown = rows.length > MAX_SHARE_ROWS ? rows.slice(0, MAX_SHARE_ROWS) : rows;
  const lines = [`${GAME_NAME} #${number} ${score}/${best}`, ...shown];
  if (rows.length > MAX_SHARE_ROWS) lines.push(`+${rows.length - MAX_SHARE_ROWS} more`);
  return lines.join("\n");
}
