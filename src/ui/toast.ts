import { el } from "./tiles";

let host: HTMLElement | undefined;

export function toast(message: string, ms = 1400): void {
  host ??= document.getElementById("toast-host") ?? undefined;
  if (!host) return;
  const t = el("div", "toast", message);
  host.prepend(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, ms);
}
