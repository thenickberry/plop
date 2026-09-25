import { describe, expect, it } from "vitest";
import { distancesTo, HELP_EXAMPLE, lettersChanged, matches, optimalLadder, validateMove } from "../src/game/ladder";
import { ACCEPTED, SCHEDULE, TARGET } from "../src/game/words";
import pinnedRaw from "../scripts/pinned.txt?raw";

const dict = new Set(["cold", "cord", "card", "ward", "warm", "worm", "word", "wood", "wool", "poop", "pool", "loop", "loot"]);

describe("validateMove", () => {
  it("accepts a one-letter change to a known unused word", () => {
    expect(validateMove("cold", "cord", ["cold"], dict)).toEqual({ ok: true });
  });
  it("rejects wrong length before anything else", () => {
    expect(validateMove("cold", "col", ["cold"], dict)).toEqual({ ok: false, reason: "wrong-length" });
  });
  it("rejects no change", () => {
    expect(validateMove("cold", "cold", ["cold"], dict)).toEqual({ ok: false, reason: "no-change" });
  });
  it("rejects more than one change, even when the word is valid", () => {
    expect(validateMove("cold", "warm", ["cold"], dict)).toEqual({ ok: false, reason: "too-many-changes" });
  });
  it("rejects rearrangements as multi-letter changes", () => {
    expect(validateMove("pool", "loop", ["pool"], dict)).toEqual({ ok: false, reason: "too-many-changes" });
  });
  it("rejects unknown words", () => {
    expect(validateMove("cold", "colx", ["cold"], dict)).toEqual({ ok: false, reason: "not-a-word" });
  });
  it("rejects words already used this game", () => {
    expect(validateMove("cord", "cold", ["cold", "cord"], dict)).toEqual({ ok: false, reason: "already-used" });
  });
  it("allows changing a letter that is already correct", () => {
    // pool -> loot breaks the leading P but is a legal move.
    expect(validateMove("pool", "poop", ["pool"], dict)).toEqual({ ok: true });
    expect(validateMove("loot", "loop", ["loot"], dict)).toEqual({ ok: true });
  });
});

describe("matches / lettersChanged", () => {
  it("marks positional matches only, including repeated letters", () => {
    expect(matches("pool", "poop")).toEqual([true, true, true, false]);
    expect(matches("oops", "poop")).toEqual([false, true, false, false]);
  });
  it("counts changed positions", () => {
    expect(lettersChanged("cold", "cord")).toBe(1);
    expect(lettersChanged("cold", "warm")).toBe(4);
  });
});

describe("optimalLadder", () => {
  it("finds a shortest path and includes both ends", () => {
    const path = optimalLadder("cold", "poop", dict)!;
    expect(path[0]).toBe("cold");
    expect(path.at(-1)).toBe("poop");
    expect(path.length - 1).toBe(distancesTo("poop", dict).get("cold"));
    for (let i = 1; i < path.length; i++) expect(lettersChanged(path[i - 1], path[i])).toBe(1);
  });
  it("returns undefined when unreachable", () => {
    expect(optimalLadder("zzzz", "poop", dict)).toBeUndefined();
  });
});

describe("shipped schedule", () => {
  it("every scheduled start word has the recorded par against the shipped dictionary", () => {
    const dist = distancesTo(TARGET, ACCEPTED);
    for (const { word, par } of SCHEDULE) {
      expect(dist.get(word), word).toBe(par);
      expect(par).toBeGreaterThanOrEqual(4);
      expect(par).toBeLessThanOrEqual(7);
      expect(matches(word, TARGET).some(Boolean), `${word} has a freebie`).toBe(false);
    }
  });
  it("contains the target and no duplicates", () => {
    expect(ACCEPTED.has(TARGET)).toBe(true);
    expect(new Set(SCHEDULE.map((s) => s.word)).size).toBe(SCHEDULE.length);
  });
  it("starts with every released puzzle, in order", () => {
    const pinned = pinnedRaw.split("\n").map((l) => l.trim()).filter((l) => /^[a-z]{4}$/.test(l));
    expect(pinned.slice(0, 2)).toEqual(["said", "wave"]);
    expect(SCHEDULE.slice(0, pinned.length).map((s) => s.word)).toEqual(pinned);
  });
});

describe("HELP_EXAMPLE", () => {
  it("is a legal ladder ending at the target", () => {
    expect(HELP_EXAMPLE.at(-1)).toBe(TARGET);
    for (let i = 1; i < HELP_EXAMPLE.length; i++) {
      expect(validateMove(HELP_EXAMPLE[i - 1], HELP_EXAMPLE[i], HELP_EXAMPLE.slice(0, i), ACCEPTED)).toEqual({ ok: true });
    }
  });
});
