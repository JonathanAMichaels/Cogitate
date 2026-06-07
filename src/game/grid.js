// Grid creation, color-flipping, and compact (de)serialization.

import { BLACK, WHITE } from './connectivity.js';

/**
 * Generate a random grid where each cell is BLACK with probability
 * `blackProbability`, drawn from the supplied seeded RNG.
 * @param {number} rows
 * @param {number} cols
 * @param {{ blackProbability?: number, rng: () => number }} opts
 * @returns {number[][]}
 */
export function generateGrid(rows, cols, { blackProbability = 0.5, rng }) {
  if (typeof rng !== 'function') {
    throw new Error('generateGrid: a seeded rng function is required');
  }
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(rng() < blackProbability ? BLACK : WHITE);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Color-invert a grid (BLACK <-> WHITE). The hook for the later "flip" phase.
 * Property: scoreGrid(flipGrid(g)).correctRatio === 1 - scoreGrid(g).correctRatio
 * @param {number[][]} grid
 * @returns {number[][]} a new grid (input is not mutated)
 */
export function flipGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell === BLACK ? WHITE : BLACK)));
}

/**
 * Serialize a grid to a compact row-major "0"/"1" string for data logging.
 * @param {number[][]} grid
 * @returns {string}
 */
export function serializeGrid(grid) {
  return grid.map((row) => row.join('')).join('');
}

/**
 * Inverse of serializeGrid.
 * @param {string} str - row-major "0"/"1" string
 * @param {number} rows
 * @param {number} cols
 * @returns {number[][]}
 */
export function deserializeGrid(str, rows, cols) {
  if (str.length !== rows * cols) {
    throw new Error('deserializeGrid: string length does not match rows*cols');
  }
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(Number(str[r * cols + c]));
    }
    grid.push(row);
  }
  return grid;
}
