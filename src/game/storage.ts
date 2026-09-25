import { emptyStats, HISTOGRAM_BUCKETS, type Stats } from "./stats";

export type GameStatus = "playing" | "won" | "gave-up";

export interface SavedGame {
  puzzleNumber: number;
  words: string[];
  status: GameStatus;
}

const KEYS = {
  game: "plop:game",
  stats: "plop:stats",
  seenHelp: "plop:seen-help",
} as const;

/** A minimal Storage shape so tests can pass a Map-backed fake. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function safeStorage(): KV | undefined {
  try {
    const s = globalThis.localStorage;
    // Accessing localStorage can throw in some embedded/private contexts.
    s.getItem("plop:probe");
    return s;
  } catch {
    return undefined;
  }
}

function read<T>(kv: KV | undefined, key: string): T | undefined {
  if (!kv) return undefined;
  try {
    const raw = kv.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(kv: KV | undefined, key: string, value: unknown): void {
  if (!kv) return;
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or disabled storage: play on without persistence */
  }
}

export function createStore(kv: KV | undefined = safeStorage()) {
  return {
    /** A save for another puzzle, or for this number before its start word was swapped, is dropped. */
    loadGame(puzzleNumber: number, startWord: string): SavedGame | undefined {
      const g = read<SavedGame>(kv, KEYS.game);
      if (!g || g.puzzleNumber !== puzzleNumber || !Array.isArray(g.words)) return undefined;
      if (g.words[0] !== startWord) return undefined;
      return g;
    },
    saveGame(game: SavedGame): void {
      write(kv, KEYS.game, game);
    },
    loadStats(): Stats {
      const s = read<Partial<Stats>>(kv, KEYS.stats);
      if (!s) return emptyStats();
      const base = emptyStats();
      const hist = Array.isArray(s.histogram) ? s.histogram : base.histogram;
      return {
        ...base,
        ...s,
        histogram: [...hist, ...new Array(HISTOGRAM_BUCKETS).fill(0)].slice(0, HISTOGRAM_BUCKETS),
      };
    },
    saveStats(stats: Stats): void {
      write(kv, KEYS.stats, stats);
    },
    hasSeenHelp(): boolean {
      return read<boolean>(kv, KEYS.seenHelp) === true;
    },
    markHelpSeen(): void {
      write(kv, KEYS.seenHelp, true);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
