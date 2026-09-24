// Generates src/data/words.json from public word lists.
//
//   accepted  : every 4-letter ENABLE1 word, minus the LDNOOBW blocklist and scripts/exclude.txt
//   schedule  : start words for the daily puzzle — accepted words that are also in the Google
//               10k common-words list, with a shortest ladder to POOP of 4..7 moves and no letter
//               already in the correct position, in a seeded shuffled order.
//
// Run with `npm run words`. Output is committed so the puzzle schedule is stable.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(here, ".cache");
const outFile = path.join(here, "..", "src", "data", "words.json");

const TARGET = "poop";
const MIN_PAR = 4;
const MAX_PAR = 7;
const SEED = 0x9e3779b9;

const SOURCES = {
  enable1: "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
  common: "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt",
  blocklist: "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
};

async function fetchCached(name, url) {
  await mkdir(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${name}.txt`);
  if (existsSync(file)) return readFile(file, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  await writeFile(file, text);
  return text;
}

const fourLetter = (text) =>
  text
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]{4}$/.test(w));

function neighbours(word, dict) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    for (let c = 97; c <= 122; c++) {
      const ch = String.fromCharCode(c);
      if (ch === word[i]) continue;
      const cand = word.slice(0, i) + ch + word.slice(i + 1);
      if (dict.has(cand)) out.push(cand);
    }
  }
  return out;
}

function bfsFrom(source, dict) {
  const dist = new Map([[source, 0]]);
  const queue = [source];
  for (let qi = 0; qi < queue.length; qi++) {
    const w = queue[qi];
    const d = dist.get(w);
    for (const n of neighbours(w, dict)) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

// mulberry32: small, deterministic, good enough to shuffle a schedule.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, seed) {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sharesPosition = (a, b) => [...a].some((ch, i) => ch === b[i]);

async function main() {
  const [enable1, common, blocklistRaw] = await Promise.all(
    Object.entries(SOURCES).map(([n, u]) => fetchCached(n, u)),
  );
  const excludeFile = path.join(here, "exclude.txt");
  const exclude = existsSync(excludeFile)
    ? new Set(fourLetter(await readFile(excludeFile, "utf8")))
    : new Set();
  const blocklist = new Set(fourLetter(blocklistRaw));

  const accepted = new Set(
    fourLetter(enable1).filter((w) => !blocklist.has(w) && !exclude.has(w)),
  );
  accepted.add(TARGET);

  const dist = bfsFrom(TARGET, accepted);
  const commonSet = new Set(fourLetter(common));

  const pool = [...accepted]
    .filter((w) => commonSet.has(w))
    .filter((w) => dist.has(w) && dist.get(w) >= MIN_PAR && dist.get(w) <= MAX_PAR)
    .filter((w) => !sharesPosition(w, TARGET))
    .sort();

  const schedule = shuffle(pool, SEED).map((word) => ({ word, par: dist.get(word) }));

  const reachable = [...accepted].filter((w) => dist.has(w)).length;
  const histogram = {};
  for (const { par } of schedule) histogram[par] = (histogram[par] ?? 0) + 1;

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    target: TARGET,
    accepted: [...accepted].sort(),
    schedule,
  };
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(out));

  console.log(`accepted words : ${accepted.size} (${reachable} can reach ${TARGET.toUpperCase()})`);
  console.log(`blocklist hits : ${fourLetter(blocklistRaw).filter((w) => fourLetter(enable1).includes(w)).length}`);
  console.log(`start pool     : ${schedule.length}`);
  console.log(`par histogram  : ${JSON.stringify(histogram)}`);
  console.log(`first ten      : ${schedule.slice(0, 10).map((s) => `${s.word}/${s.par}`).join(" ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
