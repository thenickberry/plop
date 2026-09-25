import { el, wordRow } from "./tiles";

export interface BoardView {
  words: readonly string[];
  /** Letters typed into the active row; undefined when the game is over. */
  current?: string;
}

/**
 * Keeps the DOM rows in step with the word list, reusing existing rows so that only a newly
 * submitted word plays its reveal animation.
 */
export function createBoard(root: HTMLElement, target: string) {
  let rendered = 0;
  let activeRow: HTMLDivElement | undefined;

  function ensureActiveRow(): HTMLDivElement {
    if (!activeRow) {
      activeRow = el("div", "row active");
      for (let i = 0; i < 4; i++) activeRow.appendChild(el("div", "tile"));
    }
    if (activeRow.parentElement !== root) root.appendChild(activeRow);
    return activeRow;
  }

  return {
    sync(view: BoardView, animate: boolean) {
      // Drop rows past the end of the word list (the ladder was reset).
      if (rendered > view.words.length) {
        const rows = [...root.children].filter((c) => c !== activeRow);
        for (const row of rows.slice(view.words.length)) row.remove();
        rendered = view.words.length;
      }
      // Append rows for words not yet rendered (only ever the last one, except on first paint).
      for (let i = rendered; i < view.words.length; i++) {
        const row = wordRow(view.words[i], { target, reveal: animate && i > 0 && i === view.words.length - 1 });
        if (activeRow?.parentElement === root) root.insertBefore(row, activeRow);
        else root.appendChild(row);
      }
      rendered = view.words.length;

      if (view.current === undefined) {
        activeRow?.remove();
        return;
      }
      const row = ensureActiveRow();
      const tiles = row.querySelectorAll<HTMLDivElement>(".tile");
      tiles.forEach((t, i) => {
        const ch = view.current![i] ?? "";
        const had = t.textContent;
        t.textContent = ch;
        t.classList.toggle("filled", ch !== "");
        if (ch && had !== ch) {
          t.classList.remove("pop");
          void t.offsetWidth; // restart the animation
          t.classList.add("pop");
        }
      });
      row.scrollIntoView({ block: "nearest" });
    },
    shake() {
      if (!activeRow) return;
      activeRow.classList.remove("shake");
      void activeRow.offsetWidth;
      activeRow.classList.add("shake");
      activeRow.addEventListener("animationend", () => activeRow?.classList.remove("shake"), { once: true });
    },
  };
}
