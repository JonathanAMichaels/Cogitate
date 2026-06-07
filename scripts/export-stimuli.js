// Export the experiment's stimulus set + ground-truth metrics to JSON so the
// Python simulation/analysis pipeline (analysis/) can run agents over the EXACT
// trials a participant would see. Reuses the tested game code — no rule is
// reimplemented in Python.
//
//   node scripts/export-stimuli.js            -> analysis/data/stimuli.json
//   node scripts/export-stimuli.js 240 myset  -> 240-trial set, custom name
//
// Args: [nTrials] [name]. Defaults to the live CONFIG (30 trials, 'config').

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { generateStimulusSet } from '../src/game/stimuli.js';
import { deserializeGrid } from '../src/game/grid.js';
import { summarizeFlips } from '../src/game/flips.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const nTrials = process.argv[2] ? Number(process.argv[2]) : CONFIG.nTrials;
const name = process.argv[3] || 'config';

const cfg = { ...CONFIG, nTrials };
const stimuli = generateStimulusSet(cfg);

const trials = stimuli.map((s, i) => {
  const grid = deserializeGrid(s.gridString, s.rows, s.cols);
  const flips = summarizeFlips(grid);
  return {
    index: i,
    gridString: s.gridString,
    rows: s.rows,
    cols: s.cols,
    blackScore: s.blackScore,
    whiteScore: s.whiteScore,
    correctRatio: s.correctRatio,
    countRatio: s.countRatio,
    divergence: s.divergence,
    // flip landscape (for the flip-phase / diagnosticity-aware learners)
    maxFlipDiagnosticity: flips.maxDiagnosticity,
    nArticulationPoints: flips.nArticulationPoints,
  };
});

const out = {
  meta: {
    name,
    nTrials,
    seed: cfg.seed,
    rows: cfg.rows,
    cols: cfg.cols,
    method: cfg.method,
    tileBy: cfg.tileBy,
    generatedFrom: 'scripts/export-stimuli.js',
  },
  trials,
};

const outPath = resolve(__dirname, '..', 'analysis', 'data', `stimuli-${name}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));

const divs = trials.map((t) => t.divergence);
console.log(
  `Wrote ${trials.length} trials -> ${outPath}\n` +
    `  divergence: min=${Math.min(...divs).toFixed(2)} max=${Math.max(...divs).toFixed(2)}\n` +
    `  mean maxFlipDiagnosticity=${(
      trials.reduce((s, t) => s + t.maxFlipDiagnosticity, 0) / trials.length
    ).toFixed(3)}`,
);
