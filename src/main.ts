import "./style.css";
import { ACCEPTED, TARGET } from "./game/words";
import { formatCountdown, msUntilNextPuzzle, puzzleFor, puzzleNumberAt, todaysPuzzle } from "./game/daily";
import { optimalLadder, REJECTION_TEXT, validateMove } from "./game/ladder";
import { shareText } from "./game/share";
import { averageExtra, displayedStreak, HISTOGRAM_BUCKETS, recordOutcome } from "./game/stats";
import { createStore, type GameStatus } from "./game/storage";
import { createBoard } from "./ui/board";
import { createKeyboard } from "./ui/keyboard";
import { wireDialog } from "./ui/modal";
import { el, wordRow } from "./ui/tiles";
import { toast } from "./ui/toast";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const store = createStore();
const puzzle = todaysPuzzle();

interface State {
  words: string[];
  current: string;
  status: GameStatus;
}

const saved = store.loadGame(puzzle.number);
const state: State = {
  words: saved?.words ?? [puzzle.word],
  current: "",
  status: saved?.status ?? "playing",
};

// ---------- static pieces ----------

$("target-row").replaceWith(Object.assign(wordRow(TARGET, { target: TARGET }), { id: "target-row" }));

const board = createBoard($("board"), TARGET);
const keyboard = createKeyboard($("keyboard"), onKey);
const giveUpBtn = $<HTMLButtonElement>("btn-giveup");

const help = wireDialog($<HTMLDialogElement>("dlg-help"), () => store.markHelpSeen());
const stats = wireDialog($<HTMLDialogElement>("dlg-stats"));
const results = wireDialog($<HTMLDialogElement>("dlg-results"), () => stopCountdown());

$("btn-help").addEventListener("click", () => help.open());
$("btn-stats").addEventListener("click", () => {
  renderStats();
  stats.open();
});
$("btn-share").addEventListener("click", share);

{
  const ex = $("help-example");
  for (const w of ["cake", "coke", "cope", "coop", "poop"]) ex.appendChild(wordRow(w, { target: TARGET }));
}

// ---------- game flow ----------

function guesses(): number {
  return state.words.length - 1;
}

function persist(): void {
  store.saveGame({ puzzleNumber: puzzle.number, words: state.words, status: state.status });
}

function render(animate = false): void {
  const playing = state.status === "playing";
  board.sync({ words: state.words, current: playing ? state.current : undefined }, animate);
  keyboard.setEnabled(playing);
  giveUpBtn.hidden = !playing;
}

function onKey(key: string): void {
  if (state.status !== "playing") return;
  if (key === "enter") return submit();
  if (key === "backspace") {
    state.current = state.current.slice(0, -1);
  } else if (state.current.length < 4) {
    state.current += key;
  }
  render();
}

function reject(message: string): void {
  toast(message);
  board.shake();
}

function submit(): void {
  const previous = state.words[state.words.length - 1];
  const result = validateMove(previous, state.current, state.words, ACCEPTED);
  if (!result.ok) return reject(REJECTION_TEXT[result.reason]);

  state.words.push(state.current);
  state.current = "";
  if (state.words[state.words.length - 1] === TARGET) {
    state.status = "won";
    finish();
  }
  persist();
  render(true);
}

let giveUpArmed: ReturnType<typeof setTimeout> | undefined;
giveUpBtn.addEventListener("click", () => {
  if (giveUpArmed === undefined) {
    giveUpBtn.textContent = "Really give up?";
    giveUpBtn.classList.add("danger");
    giveUpArmed = setTimeout(disarmGiveUp, 3000);
    return;
  }
  disarmGiveUp();
  state.status = "gave-up";
  state.current = "";
  finish();
  persist();
  render();
});
function disarmGiveUp(): void {
  if (giveUpArmed !== undefined) clearTimeout(giveUpArmed);
  giveUpArmed = undefined;
  giveUpBtn.textContent = "Give up";
  giveUpBtn.classList.remove("danger");
}

function finish(): void {
  const won = state.status === "won";
  store.saveStats(
    recordOutcome(store.loadStats(), { puzzleNumber: puzzle.number, won, extra: guesses() - puzzle.par }),
  );
  // Let the last row finish flipping before the modal covers it.
  setTimeout(openResults, won ? 4 * 110 + 520 : 0);
}

// ---------- results ----------

let countdownTimer: ReturnType<typeof setInterval> | undefined;

function openResults(): void {
  const won = state.status === "won";
  const n = guesses();
  const s = store.loadStats();
  const title = !won ? "Tomorrow, then" : n === puzzle.par ? "Perfect!" : "Congratulations!";
  $("results-title").textContent = title;

  const body = $("results-body");
  body.replaceChildren();
  if (won) {
    body.append("You used ", bold(`${n} ${plural(n, "guess", "guesses")}.`), " The best solution was ", bold(`${puzzle.par} guesses.`));
  } else {
    body.append("You gave up after ", bold(`${n} ${plural(n, "guess", "guesses")}.`), " The best solution was ", bold(`${puzzle.par} guesses.`));
  }
  const streak = displayedStreak(s, puzzle.number);
  $("results-streak").textContent = streak > 1 ? `🔥 ${streak} day streak` : streak === 1 ? "Streak started. Come back tomorrow." : "";

  const ladder = $("results-ladder");
  ladder.replaceChildren();
  for (const w of optimalLadder(puzzle.word, TARGET, ACCEPTED) ?? []) ladder.appendChild(wordRow(w, { target: TARGET }));
  ladder.closest("details")!.removeAttribute("open");

  tickCountdown();
  stopCountdown();
  countdownTimer = setInterval(tickCountdown, 1000);
  results.open();
}

function tickCountdown(): void {
  if (puzzleNumberAt() !== puzzle.number) {
    // The day rolled over while the tab was open; a reload picks up the new puzzle.
    location.reload();
    return;
  }
  $("countdown").textContent = formatCountdown(msUntilNextPuzzle());
}
function stopCountdown(): void {
  if (countdownTimer !== undefined) clearInterval(countdownTimer);
  countdownTimer = undefined;
}

async function share(): Promise<void> {
  const text = shareText({
    number: puzzle.number,
    words: state.words,
    target: TARGET,
    best: puzzle.par,
    gaveUp: state.status === "gave-up",
  });
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    // Older WebViews: fall back to a hidden textarea + execCommand.
    const ta = el("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? "Copied to clipboard" : "Couldn't copy. Long-press to select.");
  }
}

// ---------- stats ----------

function renderStats(): void {
  const s = store.loadStats();
  const avg = averageExtra(s);
  const grid = $("stat-grid");
  grid.replaceChildren(
    stat(String(s.games), "Played"),
    stat(String(s.wins), "Wins"),
    stat(avg === undefined ? "–" : avg.toFixed(1), "Avg. extra guesses"),
    stat(String(displayedStreak(s, puzzle.number)), "Current streak"),
    stat(String(s.bestStreak), "Best streak"),
  );

  const hist = $("histogram");
  hist.replaceChildren();
  const max = Math.max(1, ...s.histogram);
  const todayBucket =
    state.status === "won" && s.lastWon === puzzle.number ? Math.min(guesses() - puzzle.par, HISTOGRAM_BUCKETS - 1) : -1;
  s.histogram.forEach((count, i) => {
    const row = el("div", "bar-row");
    row.appendChild(el("span", "", i === HISTOGRAM_BUCKETS - 1 ? `${i}+` : String(i)));
    const bar = el("div", `bar${i === todayBucket ? " today" : ""}`, String(count));
    bar.style.width = `${Math.max(8, (count / max) * 100)}%`;
    row.appendChild(bar);
    hist.appendChild(row);
  });

  const y = $("yesterday");
  y.replaceChildren();
  if (puzzle.number > 1) {
    const prev = puzzleFor(puzzle.number - 1);
    y.className = "yesterday";
    y.appendChild(el("h3", "", `Yesterday's Plop #${prev.number}`));
    const p = el("p", "muted");
    p.append(bold(prev.word.toUpperCase()), ` to POOP in ${prev.par} guesses:`);
    y.appendChild(p);
    const ladder = el("div", "mini-ladder");
    for (const w of optimalLadder(prev.word, TARGET, ACCEPTED) ?? []) ladder.appendChild(wordRow(w, { target: TARGET }));
    y.appendChild(ladder);
  }
}

function stat(value: string, label: string): HTMLElement {
  const d = el("div", "stat");
  d.appendChild(el("strong", "", value));
  d.appendChild(el("span", "", label));
  return d;
}
function bold(text: string): HTMLElement {
  return el("strong", "", text);
}
function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ---------- boot ----------

render();
if (state.status !== "playing") {
  openResults();
} else if (!store.hasSeenHelp()) {
  help.open();
}
