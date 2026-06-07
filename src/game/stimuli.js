// Stimulus-set generation — turns a config into the ordered trial list.
//
// Each trial bundles the grid with its precomputed scores AND metrics (count
// ratio, divergence) so we can sample/"tile" the stimulus space along whatever
// dimension we care about. Generation is fully determined by the config's seed.

import { makeRng } from './rng.js';
import { generateGrid, serializeGrid } from './grid.js';
import { scoreGrid } from './scoring.js';
import { BLACK, WHITE } from './connectivity.js';

// Natural value ranges for the metrics we tile across.
const FIELD_RANGES = {
  correctRatio: [0, 1],
  countRatio: [0, 1],
  divergence: [-1, 1],
  absDivergence: [0, 1],
};

/**
 * Build a single trial object from a grid (grid + serialized form + metrics).
 */
function makeTrial(grid, rows, cols) {
  const s = scoreGrid(grid);
  return {
    grid,
    gridString: serializeGrid(grid),
    rows,
    cols,
    blackScore: s.blackScore,
    whiteScore: s.whiteScore,
    correctRatio: s.correctRatio,
    blackCount: s.blackCount,
    whiteCount: s.whiteCount,
    countRatio: s.countRatio,
    divergence: s.divergence,
    absDivergence: s.absDivergence,
  };
}

/** Fisher–Yates shuffle using the supplied seeded RNG (in place). */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Which bin (0..nBins-1) a value falls into within [lo, hi]. */
function binIndex(value, [lo, hi], nBins) {
  const b = Math.floor(((value - lo) / (hi - lo)) * nBins);
  return Math.max(0, Math.min(nBins - 1, b));
}

const cloneGrid = (g) => g.map((row) => [...row]);

/** Distance from a grid's metrics to the requested targets (weighted L1). */
function targetLoss(metrics, targets, weights) {
  let l = 0;
  for (const k of Object.keys(targets)) {
    l += (weights?.[k] ?? 1) * Math.abs(metrics[k] - targets[k]);
  }
  return l;
}

/**
 * Construct a grid whose metrics hit the requested targets, via local search
 * (greedy cell-flips with occasional uphill moves to escape local minima).
 * Lets us build grids at ANY divergence (or countRatio, correctRatio, ...) the
 * geometry allows — not just whatever random sampling happens to produce.
 *
 * @param {number} rows
 * @param {number} cols
 * @param {Object<string,number>} targets - e.g. { divergence: 0.4 } or
 *   { divergence: 0.4, countRatio: 0.5 }
 * @param {object} opts
 * @param {() => number} opts.rng - seeded RNG
 * @param {number} [opts.maxIters=6000]
 * @param {number} [opts.tolerance=0.01] - stop once loss drops below this
 * @param {Object<string,number>} [opts.weights] - per-field loss weights
 * @returns {{ grid: number[][], metrics: object, achievedLoss: number }}
 */
export function buildGrid(rows, cols, targets, opts) {
  const { rng, maxIters = 6000, tolerance = 0.01, weights, restarts = 4 } = opts;

  let globalBest = null;

  for (let attempt = 0; attempt < restarts; attempt++) {
    // Vary the starting density across restarts to explore different basins.
    let grid = generateGrid(rows, cols, { blackProbability: 0.3 + 0.4 * rng(), rng });
    let metrics = scoreGrid(grid);
    let curLoss = targetLoss(metrics, targets, weights);
    let best = { grid: cloneGrid(grid), metrics, loss: curLoss };

    for (let i = 0; i < maxIters && best.loss > tolerance; i++) {
      const r = Math.floor(rng() * rows);
      const c = Math.floor(rng() * cols);
      grid[r][c] = grid[r][c] === BLACK ? WHITE : BLACK; // tentative flip

      const m = scoreGrid(grid);
      const l = targetLoss(m, targets, weights);

      if (l <= curLoss || rng() < 0.05) {
        curLoss = l;
        metrics = m;
        if (l < best.loss) best = { grid: cloneGrid(grid), metrics: m, loss: l };
      } else {
        grid[r][c] = grid[r][c] === BLACK ? WHITE : BLACK; // revert
      }
    }

    if (!globalBest || best.loss < globalBest.loss) globalBest = best;
    if (globalBest.loss <= tolerance) break;
  }

  return { grid: globalBest.grid, metrics: globalBest.metrics, achievedLoss: globalBest.loss };
}

// Feasible target ranges for construction. Divergence has a geometric ceiling
// (~±0.41 on 9x9, ~±0.47 on 16x16) because fragmenting one color requires the
// other color as separators, which fights the count term. Targets beyond the
// ceiling simply resolve to the closest reachable grid.
const CONSTRUCT_RANGES = {
  divergence: [-0.4, 0.4],
  correctRatio: [0.05, 0.95],
  countRatio: [0.1, 0.9],
  absDivergence: [0, 0.4],
};

/** Evenly spaced target values across [lo, hi] (n points, inclusive ends). */
function linspace(lo, hi, n) {
  if (n <= 1) return [(lo + hi) / 2];
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

/**
 * Build a stimulus set by CONSTRUCTING grids at evenly spaced targets across the
 * tiled metric space (1-D or 2-D). Gives dense, controllable coverage instead of
 * relying on what random sampling reaches.
 *
 * @param {object} config - same shape as generateStimulusSet, plus:
 *   @param {string|string[]} [config.tileBy='divergence']
 *   @param {Object<string,[number,number]>} [config.ranges] - per-field target
 *     ranges (defaults in CONSTRUCT_RANGES)
 *   @param {number|number[]} [config.nBins] - lattice resolution per dimension
 *     for 2-D; for 1-D, targets are spread across nTrials points by default
 *   @param {number} [config.maxIters], [config.tolerance], [config.weights]
 * @returns {object[]} ordered trial list
 */
export function buildStimulusSet(config) {
  const {
    seed,
    rows,
    cols,
    nTrials,
    tileBy = 'divergence',
    ranges = {},
    nBins,
    maxIters,
    tolerance,
    weights,
    logStimulusSummary = false,
  } = config;

  const rng = makeRng(seed);
  const fields = Array.isArray(tileBy) ? tileBy : [tileBy];
  const rangeFor = (f) => ranges[f] || CONSTRUCT_RANGES[f] || [0, 1];

  // Build the list of target points.
  let targetPoints;
  if (fields.length === 1) {
    targetPoints = linspace(...rangeFor(fields[0]), nTrials).map((v) => ({ [fields[0]]: v }));
  } else {
    // 2-D (or N-D) lattice, then cycle/trim to nTrials.
    const counts = Array.isArray(nBins) ? nBins : fields.map(() => nBins || 5);
    const axes = fields.map((f, d) => linspace(...rangeFor(f), counts[d]));
    let lattice = [{}];
    axes.forEach((vals, d) => {
      const next = [];
      for (const pt of lattice) for (const v of vals) next.push({ ...pt, [fields[d]]: v });
      lattice = next;
    });
    targetPoints = Array.from({ length: nTrials }, (_, i) => lattice[i % lattice.length]);
  }

  const trials = targetPoints.map((targets) => {
    const built = buildGrid(rows, cols, targets, { rng, maxIters, tolerance, weights });
    return makeTrial(built.grid, rows, cols);
  });

  const result = shuffle(trials, rng);
  if (logStimulusSummary) logSummary(result, tileBy);
  return result;
}

/**
 * Generate an ordered list of trials.
 *
 * @param {object} config
 * @param {string|number} config.seed
 * @param {number} config.rows
 * @param {number} config.cols
 * @param {number} config.nTrials
 * @param {number} [config.blackProbability=0.5] - per-cell black probability.
 * @param {boolean} [config.varyDensity=false] - if true, draw blackProbability
 *   per grid uniformly from `densityRange` (widens the metric space, helps fill
 *   extreme divergence/count bins).
 * @param {[number, number]} [config.densityRange=[0.35, 0.65]]
 * @param {boolean} [config.spreadAcrossBins=true] - if false, return raw random
 *   draws with no coverage control.
 * @param {string|string[]} [config.tileBy='correctRatio'] - metric(s) to tile
 *   the stimulus space across. One of correctRatio | countRatio | divergence |
 *   absDivergence, or an array of two for 2-D tiling.
 * @param {number|number[]} [config.nBins=10] - bins per tiled dimension.
 * @param {Object<string,[number,number]>} [config.ranges] - override the
 *   binning range for any field (defaults in FIELD_RANGES).
 * @param {number} [config.oversampleFactor=40] - candidate pool = nTrials * this.
 * @param {boolean} [config.logStimulusSummary=false] - console.info coverage.
 * @param {number[][][]} [config.grids] - explicit hand-curated grids; used
 *   verbatim when provided (random generation skipped).
 * @returns {object[]} ordered trial list
 */
export function generateStimulusSet(config) {
  const {
    seed,
    rows,
    cols,
    nTrials,
    blackProbability = 0.5,
    varyDensity = false,
    densityRange = [0.35, 0.65],
    spreadAcrossBins = true,
    tileBy = 'correctRatio',
    nBins = 10,
    ranges = {},
    oversampleFactor = 40,
    logStimulusSummary = false,
    grids = null,
    method = 'sample', // 'sample' (random + bin) or 'construct' (local search)
  } = config;

  // Constructive generation: build grids at chosen targets (handled separately),
  // unless explicit grids were supplied.
  if (method === 'construct' && !grids) {
    return buildStimulusSet(config);
  }

  const rng = makeRng(seed);

  const drawGrid = () => {
    const p = varyDensity
      ? densityRange[0] + rng() * (densityRange[1] - densityRange[0])
      : blackProbability;
    return generateGrid(rows, cols, { blackProbability: p, rng });
  };

  // Path 1: explicit curated grids — use as given.
  if (grids && grids.length > 0) {
    return grids.map((g) => makeTrial(g, g.length, g[0].length));
  }

  // Path 2: raw random draws, no coverage control.
  if (!spreadAcrossBins) {
    const trials = [];
    for (let i = 0; i < nTrials; i++) trials.push(makeTrial(drawGrid(), rows, cols));
    if (logStimulusSummary) logSummary(trials, tileBy);
    return trials;
  }

  // Path 3: oversample a candidate pool, then pick evenly across the bins of the
  // chosen metric dimension(s).
  const fields = Array.isArray(tileBy) ? tileBy : [tileBy];
  const binCounts = Array.isArray(nBins) ? nBins : fields.map(() => nBins);

  const poolSize = nTrials * oversampleFactor;
  const buckets = new Map();
  for (let i = 0; i < poolSize; i++) {
    const trial = makeTrial(drawGrid(), rows, cols);
    const key = fields
      .map((f, d) => binIndex(trial[f], ranges[f] || FIELD_RANGES[f], binCounts[d]))
      .join(',');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(trial);
  }

  // Round-robin across non-empty buckets until we have nTrials.
  const bucketList = [...buckets.values()];
  const selected = [];
  let exhausted = false;
  while (selected.length < nTrials && !exhausted) {
    exhausted = true;
    for (const bucket of bucketList) {
      if (bucket.length > 0) {
        selected.push(bucket.pop());
        exhausted = false;
        if (selected.length >= nTrials) break;
      }
    }
  }

  if (selected.length < nTrials) {
    console.warn(
      `generateStimulusSet: only found ${selected.length}/${nTrials} trials ` +
        `tiling by [${fields.join(', ')}]. Raise oversampleFactor or widen densityRange.`,
    );
  }

  const result = shuffle(selected, rng);
  if (logStimulusSummary) logSummary(result, tileBy);
  return result;
}

/** Console summary of how the set covers a metric — for piloting/tuning. */
function logSummary(trials, tileBy) {
  const fields = Array.isArray(tileBy) ? tileBy : [tileBy];
  const lines = fields.map((f) => {
    const vals = trials.map((t) => t[f]).sort((a, b) => a - b);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    return `${f}: min=${vals[0].toFixed(2)} max=${vals[vals.length - 1].toFixed(2)} mean=${mean.toFixed(2)}`;
  });
  console.info(`[stimuli] ${trials.length} trials — ${lines.join('  |  ')}`);
}
