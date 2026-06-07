// Scoring — turns a grid into the correct slider answer, plus the
// "counting divergence" metric used to characterize and tile stimuli.
//
// The hidden rule: each color's score is the size of its LARGEST contiguous
// region (not its total count). The correct slider position runs
// white (0) -> black (1):
//   correctRatio = blackScore / (blackScore + whiteScore)
//
// A naive observer who simply COUNTS squares would instead answer:
//   countRatio = blackCount / totalCells
//
// The divergence between these is the key stimulus dimension: where it is ~0,
// counting gives an accurate score; where it is large, counting is misleading.
//   divergence = correctRatio - countRatio   (signed; +ve = rule favors black
//                                             more than counting would suggest)

import { BLACK, WHITE, largestRegion } from './connectivity.js';

/**
 * Score a grid under the hidden contiguity rule, with counting metrics.
 * @param {number[][]} grid - rows of cells (BLACK/WHITE)
 * @returns {{
 *   blackScore: number,
 *   whiteScore: number,
 *   correctRatio: number,
 *   blackCount: number,
 *   whiteCount: number,
 *   countRatio: number,
 *   divergence: number,
 *   absDivergence: number,
 *   blackRegion: Array<[number, number]>,
 *   whiteRegion: Array<[number, number]>,
 * }}
 */
export function scoreGrid(grid) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) {
    throw new Error('scoreGrid: grid must be non-empty');
  }

  const black = largestRegion(grid, BLACK);
  const white = largestRegion(grid, WHITE);

  const denom = black.size + white.size;
  // denom is always > 0 for a non-empty grid (every cell is BLACK or WHITE, so
  // at least one color has a region of size >= 1).
  const correctRatio = black.size / denom;

  // Counting metrics.
  let blackCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === BLACK) blackCount++;
    }
  }
  const total = rows * cols;
  const whiteCount = total - blackCount;
  const countRatio = blackCount / total;
  const divergence = correctRatio - countRatio;

  return {
    blackScore: black.size,
    whiteScore: white.size,
    correctRatio,
    blackCount,
    whiteCount,
    countRatio,
    divergence,
    absDivergence: Math.abs(divergence),
    blackRegion: black.cells,
    whiteRegion: white.cells,
  };
}
