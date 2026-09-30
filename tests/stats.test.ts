import { describe, expect, it } from "vitest";
import { averageExtra, displayedStreak, emptyStats, recordOutcome } from "../src/game/stats";
import { createStore } from "../src/game/storage";

function fakeKV() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("recordOutcome", () => {
  it("builds a streak over consecutive puzzles", () => {
    let s = emptyStats();
    s = recordOutcome(s, { puzzleNumber: 1, won: true, extra: 0 });
    s = recordOutcome(s, { puzzleNumber: 2, won: true, extra: 2 });
    expect(s.currentStreak).toBe(2);
    expect(s.bestStreak).toBe(2);
    expect(s.wins).toBe(2);
    expect(s.histogram[0]).toBe(1);
    expect(s.histogram[2]).toBe(1);
    expect(averageExtra(s)).toBe(1);
  });
  it("resets the streak on a missed day but keeps best", () => {
    let s = emptyStats();
    s = recordOutcome(s, { puzzleNumber: 1, won: true, extra: 0 });
    s = recordOutcome(s, { puzzleNumber: 2, won: true, extra: 0 });
    s = recordOutcome(s, { puzzleNumber: 5, won: true, extra: 0 });
    expect(s.currentStreak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });
  it("counts a give-up as played and breaks the streak", () => {
    let s = emptyStats();
    s = recordOutcome(s, { puzzleNumber: 1, won: true, extra: 0 });
    s = recordOutcome(s, { puzzleNumber: 2, won: false, extra: 0 });
    expect(s.games).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.currentStreak).toBe(0);
    expect(s.lastPlayed).toBe(2);
  });
  it("buckets 6 or more extra guesses together", () => {
    const s = recordOutcome(emptyStats(), { puzzleNumber: 1, won: true, extra: 11 });
    expect(s.histogram[6]).toBe(1);
  });
  it("ignores a repeat of an already recorded puzzle", () => {
    const a = recordOutcome(emptyStats(), { puzzleNumber: 3, won: true, extra: 0 });
    const b = recordOutcome(a, { puzzleNumber: 3, won: true, extra: 0 });
    expect(b).toBe(a);
  });
});

describe("displayedStreak", () => {
  it("shows the streak while it can still be extended today", () => {
    const s = recordOutcome(emptyStats(), { puzzleNumber: 4, won: true, extra: 0 });
    expect(displayedStreak(s, 4)).toBe(1);
    expect(displayedStreak(s, 5)).toBe(1);
    expect(displayedStreak(s, 6)).toBe(0);
  });
});

describe("store", () => {
  it("round-trips a game and drops it when the puzzle changes", () => {
    const store = createStore(fakeKV());
    store.saveGame({ puzzleNumber: 2, words: ["cold", "cord"], status: "playing" });
    expect(store.loadGame(2, "cold")?.words).toEqual(["cold", "cord"]);
    expect(store.loadGame(3, "cold")).toBeUndefined();
  });
  it("drops a save whose start word no longer matches the puzzle", () => {
    const store = createStore(fakeKV());
    store.saveGame({ puzzleNumber: 2, words: ["fuji", "fuci"], status: "playing" });
    expect(store.loadGame(2, "wave")).toBeUndefined();
  });
  it("repairs a short histogram from an older save", () => {
    const kv = fakeKV();
    kv.setItem("plop:stats", JSON.stringify({ games: 1, wins: 1, histogram: [1, 0] }));
    const s = createStore(kv).loadStats();
    expect(s.histogram).toHaveLength(7);
    expect(s.currentStreak).toBe(0);
  });
  it("survives a missing storage", () => {
    const store = createStore(undefined);
    expect(store.loadStats().games).toBe(0);
    expect(() => store.saveStats(emptyStats())).not.toThrow();
  });
});
