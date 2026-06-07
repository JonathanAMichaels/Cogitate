// Flip-informativeness engine.
//
// The planned "single-tile flip" manipulation toggles ONE cell and asks the
// participant to re-judge. Flipping any cell changes the COUNT answer by exactly
// ±1/N, but changes the TRUE (largest-region) answer by an amount that depends
// entirely on which cell is flipped. The flips that best DISSOCIATE counting from
// the contiguity rule — e.g. articulation/bridge cells that split or merge a
// largest region — are the most diagnostic: they are near-proof that the rule
// isn't counting. This module scores every possible single flip so we can SELECT
// flips of a target informativeness for the experiment and characterize stimuli.
//
// See docs/SYNTHESIS.md §2.

import { BLACK, WHITE } from './connectivity.js';
import { scoreGrid } from './scoring.js';

/**
 * Effect of flipping each cell of a grid.
 * @param {number[][]} grid
 * @returns {Array<{
 *   r:number, c:number, fromColor:number, toColor:number,
 *   newCorrectRatio:number, deltaCorrect:number, deltaCount:number,
 *   deltaBlackScore:number, deltaWhiteScore:number,
 *   diagnosticity:number, isArticulation:boolean
 * }>} one entry per cell, row-major.
 *
 * - `deltaCorrect` = change in the true (largest-region) slider answer.
 * - `deltaCount`   = change in the counting answer (= ±1/N).
 * - `diagnosticity`= |deltaCorrect − deltaCount|: how differently the contiguity
 *                    rule and the count rule predict this flip's effect. High =
 *                    maximally informative about which rule is correct.
 * - `isArticulation` = flipping the cell changed its OWN color's largest region
 *                      by more than 1 (it split/merged a region) — the structural
 *                      signature of a high-impact flip.
 */
export function flipEffects(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const N = rows * cols;
  const base = scoreGrid(grid);

  const effects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fromColor = grid[r][c];
      const toColor = fromColor === BLACK ? WHITE : BLACK;

      grid[r][c] = toColor; // mutate in place...
      const s = scoreGrid(grid);
      grid[r][c] = fromColor; // ...and restore

      const deltaCorrect = s.correctRatio - base.correctRatio;
      const deltaCount = (toColor === BLACK ? 1 : -1) / N;
      const deltaBlackScore = s.blackScore - base.blackScore;
      const deltaWhiteScore = s.whiteScore - base.whiteScore;
      // Own-color region change: flipping a black cell removes it from black, etc.
      const ownDelta = fromColor === BLACK ? deltaBlackScore : deltaWhiteScore;

      effects.push({
        r,
        c,
        fromColor,
        toColor,
        newCorrectRatio: s.correctRatio,
        deltaCorrect,
        deltaCount,
        deltaBlackScore,
        deltaWhiteScore,
        diagnosticity: Math.abs(deltaCorrect - deltaCount),
        isArticulation: Math.abs(ownDelta) > 1,
      });
    }
  }
  return effects;
}

/**
 * Rank all single flips by a chosen informativeness metric (descending).
 * @param {number[][]} grid
 * @param {{ by?: 'diagnosticity'|'absDeltaCorrect' }} [opts]
 * @returns {Array} flip-effect objects, sorted most→least informative
 */
export function rankFlips(grid, { by = 'diagnosticity' } = {}) {
  const key = (e) => (by === 'absDeltaCorrect' ? Math.abs(e.deltaCorrect) : e.diagnosticity);
  return flipEffects(grid).sort((a, b) => key(b) - key(a));
}

/** The single most informative flip (default metric = diagnosticity). */
export function mostInformativeFlip(grid, opts = {}) {
  return rankFlips(grid, opts)[0];
}

/** The single least informative flip (often an interior cell, Δ ≈ 0). */
export function leastInformativeFlip(grid, opts = {}) {
  const ranked = rankFlips(grid, opts);
  return ranked[ranked.length - 1];
}

/**
 * Select the flip whose informativeness is closest to a target value, e.g. to
 * build graded "informative vs uninformative flip" experimental conditions.
 * @param {number[][]} grid
 * @param {number} target - desired diagnosticity (or absDeltaCorrect) value
 * @param {{ by?: 'diagnosticity'|'absDeltaCorrect' }} [opts]
 */
export function selectFlipByInformativeness(grid, target, { by = 'diagnosticity' } = {}) {
  const key = (e) => (by === 'absDeltaCorrect' ? Math.abs(e.deltaCorrect) : e.diagnosticity);
  let best = null;
  let bestDist = Infinity;
  for (const e of flipEffects(grid)) {
    const d = Math.abs(key(e) - target);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

/**
 * Summary characterization of a grid's flip landscape (for stimulus selection).
 * @param {number[][]} grid
 * @returns {{
 *   maxDiagnosticity:number, meanDiagnosticity:number,
 *   maxAbsDeltaCorrect:number, nArticulationPoints:number, nCells:number
 * }}
 */
export function summarizeFlips(grid) {
  const effects = flipEffects(grid);
  let maxDiag = 0;
  let sumDiag = 0;
  let maxAbsDelta = 0;
  let nArt = 0;
  for (const e of effects) {
    maxDiag = Math.max(maxDiag, e.diagnosticity);
    sumDiag += e.diagnosticity;
    maxAbsDelta = Math.max(maxAbsDelta, Math.abs(e.deltaCorrect));
    if (e.isArticulation) nArt++;
  }
  return {
    maxDiagnosticity: maxDiag,
    meanDiagnosticity: sumDiag / effects.length,
    maxAbsDeltaCorrect: maxAbsDelta,
    nArticulationPoints: nArt,
    nCells: effects.length,
  };
}
