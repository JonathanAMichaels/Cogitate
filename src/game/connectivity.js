// Largest-contiguous-region computation — the heart of the hidden rule.
//
// A grid is a 2D array (rows of columns) of cell values. By convention:
//   BLACK = 1, WHITE = 0
// Connectivity is ORTHOGONAL (4-way): two same-colored cells join a region only
// if they share an edge. Diagonal touches do NOT connect.

export const BLACK = 1;
export const WHITE = 0;

const NEIGHBORS_4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Find the largest contiguous (4-connected) region of a given color.
 * @param {number[][]} grid - rows of cells (BLACK/WHITE)
 * @param {number} color - BLACK or WHITE
 * @returns {{ size: number, cells: Array<[number, number]> }}
 *   size of the largest region and the [row, col] cells composing it.
 *   Returns { size: 0, cells: [] } when the color is absent.
 */
export function largestRegion(grid, color) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  let best = { size: 0, cells: [] };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== color || visited[r][c]) continue;

      // Iterative flood fill from this seed cell.
      const stack = [[r, c]];
      visited[r][c] = true;
      const cells = [];

      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        cells.push([cr, cc]);
        for (const [dr, dc] of NEIGHBORS_4) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols &&
            !visited[nr][nc] &&
            grid[nr][nc] === color
          ) {
            visited[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }

      if (cells.length > best.size) {
        best = { size: cells.length, cells };
      }
    }
  }

  return best;
}
