import { el } from "./tiles";

export type KeyHandler = (key: string) => void;

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function createKeyboard(root: HTMLElement, onKey: KeyHandler) {
  const buttons: HTMLButtonElement[] = [];
  ROWS.forEach((letters, r) => {
    const row = el("div", "kb-row");
    if (r === 1) row.appendChild(el("div", "kb-spacer"));
    if (r === 2) row.appendChild(makeKey("Enter", "enter", true));
    for (const ch of letters) row.appendChild(makeKey(ch, ch));
    if (r === 2) row.appendChild(makeKey("⌫", "backspace", true));
    if (r === 1) row.appendChild(el("div", "kb-spacer"));
    root.appendChild(row);
  });

  function makeKey(label: string, key: string, wide = false): HTMLButtonElement {
    const b = el("button", wide ? "key wide" : "key", label);
    b.type = "button";
    b.dataset.key = key;
    b.setAttribute("aria-label", key === "backspace" ? "Backspace" : label);
    b.addEventListener("click", () => onKey(key));
    buttons.push(b);
    return b;
  }

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector("dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (k === "enter" || k === "backspace" || /^[a-z]$/.test(k)) {
      e.preventDefault();
      onKey(k);
    }
  });

  return {
    setEnabled(enabled: boolean) {
      for (const b of buttons) b.disabled = !enabled;
    },
  };
}
