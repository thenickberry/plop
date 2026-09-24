import { matches } from "../game/ladder";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export interface RowOptions {
  /** Colour tiles that match the target. */
  target?: string;
  /** Stagger a flip animation across the tiles. */
  reveal?: boolean;
  className?: string;
}

/** A finished, coloured row of four tiles. */
export function wordRow(word: string, opts: RowOptions = {}): HTMLDivElement {
  const row = el("div", `row ${opts.className ?? ""}`.trim());
  const hits = opts.target ? matches(word, opts.target) : [];
  [...word].forEach((ch, i) => {
    const t = el("div", "tile filled", ch);
    t.style.setProperty("--i", String(i));
    if (hits[i]) t.classList.add("hit");
    if (opts.reveal) t.classList.add("reveal");
    row.appendChild(t);
  });
  return row;
}
