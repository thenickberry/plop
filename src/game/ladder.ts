export type MoveRejection =
  | "not-a-word"
  | "no-change"
  | "too-many-changes"
  | "already-used"
  | "wrong-length";

export type MoveResult = { ok: true } | { ok: false; reason: MoveRejection };

export const REJECTION_TEXT: Record<MoveRejection, string> = {
  "not-a-word": "Not in word list",
  "no-change": "Change one letter",
  "too-many-changes": "Change exactly one letter",
  "already-used": "Already used that word",
  "wrong-length": "Four letters, please",
};

/** The ladder shown in the help dialog. A test holds it to the rules. */
export const HELP_EXAMPLE = ["cake", "coke", "come", "comp", "coop", "poop"] as const;

export function lettersChanged(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/** Order matters: the most specific, most actionable message wins. */
export function validateMove(
  previous: string,
  next: string,
  used: readonly string[],
  accepted: ReadonlySet<string>,
): MoveResult {
  if (next.length !== 4) return { ok: false, reason: "wrong-length" };
  const changed = lettersChanged(previous, next);
  if (changed === 0) return { ok: false, reason: "no-change" };
  if (changed > 1) return { ok: false, reason: "too-many-changes" };
  if (!accepted.has(next)) return { ok: false, reason: "not-a-word" };
  if (used.includes(next)) return { ok: false, reason: "already-used" };
  return { ok: true };
}

/** Which positions of `word` already match `target`. */
export function matches(word: string, target: string): boolean[] {
  return [...target].map((ch, i) => word[i] === ch);
}

export function neighbours(word: string, dict: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    for (let c = 97; c <= 122; c++) {
      const ch = String.fromCharCode(c);
      if (ch === word[i]) continue;
      const cand = word.slice(0, i) + ch + word.slice(i + 1);
      if (dict.has(cand)) out.push(cand);
    }
  }
  return out;
}

/** Breadth-first distances from `source` to every reachable word. */
export function distancesFrom(source: string, dict: ReadonlySet<string>): Map<string, number> {
  const dist = new Map<string, number>([[source, 0]]);
  const queue = [source];
  for (let qi = 0; qi < queue.length; qi++) {
    const w = queue[qi];
    const d = dist.get(w)!;
    for (const n of neighbours(w, dict)) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

let cachedTarget: string | undefined;
let cachedDict: ReadonlySet<string> | undefined;
let cachedDist: Map<string, number> | undefined;

/** Distances to `target`, memoised for the (target, dict) pair. Ladders are undirected, so BFS from the target suffices. */
export function distancesTo(target: string, dict: ReadonlySet<string>): Map<string, number> {
  if (cachedDist && cachedTarget === target && cachedDict === dict) return cachedDist;
  cachedTarget = target;
  cachedDict = dict;
  cachedDist = distancesFrom(target, dict);
  return cachedDist;
}

/** One shortest ladder from `start` to `target`, inclusive of both ends. Undefined if unreachable. */
export function optimalLadder(
  start: string,
  target: string,
  dict: ReadonlySet<string>,
): string[] | undefined {
  const dist = distancesTo(target, dict);
  if (!dist.has(start)) return undefined;
  const path = [start];
  let cur = start;
  while (cur !== target) {
    const d = dist.get(cur)!;
    // Prefer neighbours alphabetically so the revealed ladder is deterministic.
    const next = neighbours(cur, dict)
      .filter((n) => dist.get(n) === d - 1)
      .sort()[0];
    if (!next) return undefined;
    path.push(next);
    cur = next;
  }
  return path;
}
