import { describe, expect, it } from "vitest";
import { emojiRow, MAX_SHARE_ROWS, shareText } from "../src/game/share";

describe("shareText", () => {
  it("matches the agreed format", () => {
    const text = shareText({
      number: 42,
      words: ["cake", "coke", "come", "comp", "coop", "poop"],
      target: "poop",
      best: 5,
      url: "https://example.test/",
    });
    expect(text).toBe(
      ["Plop #42 5/5", "⬜⬜⬜⬜", "⬜🟫⬜⬜", "⬜🟫⬜⬜", "⬜🟫⬜🟫", "⬜🟫🟫🟫", "🟫🟫🟫🟫", "", "https://example.test/"].join("\n"),
    );
  });
  it("marks a give-up with X", () => {
    const text = shareText({ number: 1, words: ["cold", "cord"], target: "poop", best: 5, gaveUp: true });
    expect(text.split("\n")[0]).toBe("Plop #1 X/5");
  });
  it("caps the grid and reports the remainder", () => {
    const words = new Array(20).fill("cake");
    const lines = shareText({ number: 7, words, target: "poop", best: 4 }).split("\n");
    expect(lines.slice(1, 1 + MAX_SHARE_ROWS).every((l) => l === "⬜⬜⬜⬜")).toBe(true);
    expect(lines[1 + MAX_SHARE_ROWS]).toBe("+8 more");
    expect(lines[0]).toBe("Plop #7 19/4");
  });
  it("does not add a remainder line at exactly the cap", () => {
    const words = new Array(MAX_SHARE_ROWS).fill("cake");
    const lines = shareText({ number: 7, words, target: "poop", best: 4 }).split("\n");
    expect(lines).toHaveLength(1 + MAX_SHARE_ROWS + 2);
  });
  it("renders repeated letters positionally", () => {
    expect(emojiRow("oops", "poop")).toBe("⬜🟫⬜⬜");
  });
});
