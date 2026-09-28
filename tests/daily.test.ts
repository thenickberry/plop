import { describe, expect, it } from "vitest";
import { formatCountdown, msUntilNextPuzzle, puzzleFor, puzzleNumberAt } from "../src/game/daily";

const sched = [
  { word: "aaaa", par: 4 },
  { word: "bbbb", par: 5 },
  { word: "cccc", par: 6 },
];

// vite.config.ts runs tests with TZ=America/New_York.
it("runs in the pinned timezone", () => {
  expect(new Date(Date.UTC(2026, 8, 24, 12)).getTimezoneOffset()).toBe(240);
});

describe("puzzleNumberAt", () => {
  it("is #1 for the whole epoch day in local time", () => {
    expect(puzzleNumberAt(new Date(2026, 8, 24, 0, 0))).toBe(1);
    expect(puzzleNumberAt(new Date(2026, 8, 24, 23, 59, 59, 999))).toBe(1);
    expect(puzzleNumberAt(new Date(2026, 8, 25, 0, 0))).toBe(2);
  });
  it("rolls over at local midnight, not UTC midnight", () => {
    // 2026-09-26T02:00Z is still the evening of the 25th in New York: #2, not #3.
    expect(puzzleNumberAt(new Date(Date.UTC(2026, 8, 26, 2, 0)))).toBe(2);
    expect(puzzleNumberAt(new Date(Date.UTC(2026, 8, 26, 4, 0)))).toBe(3);
  });
  it("counts DST-shortened and -lengthened days as one puzzle each", () => {
    // US DST ends 2026-11-01 (25-hour day) and starts 2027-03-14 (23-hour day).
    expect(puzzleNumberAt(new Date(2026, 10, 1, 23, 59)) - puzzleNumberAt(new Date(2026, 10, 1, 0, 0))).toBe(0);
    expect(puzzleNumberAt(new Date(2026, 10, 2, 0, 0)) - puzzleNumberAt(new Date(2026, 10, 1, 0, 0))).toBe(1);
    expect(puzzleNumberAt(new Date(2027, 2, 15, 0, 0)) - puzzleNumberAt(new Date(2027, 2, 14, 0, 0))).toBe(1);
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
  it("counts down to the next local midnight", () => {
    const now = new Date(2026, 8, 24, 22, 30, 15);
    expect(formatCountdown(msUntilNextPuzzle(now))).toBe("01:29:45");
  });
  it("counts the extra hour on the day DST ends", () => {
    const now = new Date(2026, 10, 1, 0, 0, 0);
    expect(formatCountdown(msUntilNextPuzzle(now))).toBe("25:00:00");
  });
  it("pads and clamps", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
});
