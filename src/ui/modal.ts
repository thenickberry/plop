export function wireDialog(dlg: HTMLDialogElement, onClose?: () => void) {
  dlg.querySelectorAll<HTMLElement>("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.addEventListener("click", (e) => {
    // Clicks on the backdrop land on the dialog element itself, not its children.
    if (e.target === dlg) dlg.close();
  });
  if (onClose) dlg.addEventListener("close", onClose);
  return {
    open() {
      if (!dlg.open) dlg.showModal();
    },
    close() {
      if (dlg.open) dlg.close();
    },
  };
}
