import { describe, expect, it } from "vitest";
import { EPOCH_UTC, formatCountdown, msUntilNextPuzzle, puzzleFor, puzzleNumberAt } from "../src/game/daily";

const sched = [
  { word: "aaaa", par: 4 },
  { word: "bbbb", par: 5 },
  { word: "cccc", par: 6 },
];

describe("puzzleNumberAt", () => {
  it("is #1 for the whole epoch day in UTC", () => {
    expect(puzzleNumberAt(new Date(EPOCH_UTC))).toBe(1);
    expect(puzzleNumberAt(new Date(EPOCH_UTC + 86_399_999))).toBe(1);
    expect(puzzleNumberAt(new Date(EPOCH_UTC + 86_400_000))).toBe(2);
  });
  it("rolls over at midnight UTC regardless of local timezone", () => {
    // 2026-09-25T23:59Z is still #2; 2026-09-26T00:00Z is #3.
    expect(puzzleNumberAt(new Date(Date.UTC(2026, 8, 25, 23, 59)))).toBe(2);
    expect(puzzleNumberAt(new Date(Date.UTC(2026, 8, 26, 0, 0)))).toBe(3);
  });
});

describe("puzzleFor", () => {
  it("indexes the schedule from 1 and wraps", () => {
    expect(puzzleFor(1, sched).word).toBe("aaaa");
    expect(puzzleFor(3, sched).word).toBe("cccc");
    expect(puzzleFor(4, sched).word).toBe("aaaa");
    expect(puzzleFor(4, sched).number).toBe(4);
  });
  it("tolerates numbers at or below zero without throwing", () => {
    expect(puzzleFor(0, sched).word).toBe("cccc");
  });
});

describe("countdown", () => {
  it("counts down to the next UTC midnight", () => {
    const now = new Date(Date.UTC(2026, 8, 24, 22, 30, 15));
    expect(formatCountdown(msUntilNextPuzzle(now))).toBe("01:29:45");
  });
  it("pads and clamps", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
});
