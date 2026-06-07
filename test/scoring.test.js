import { describe, it, expect } from 'vitest';
import { BLACK, WHITE, largestRegion } from '../src/game/connectivity.js';
import { scoreGrid } from '../src/game/scoring.js';
import { flipGrid, serializeGrid, deserializeGrid, generateGrid } from '../src/game/grid.js';
import { makeRng } from '../src/game/rng.js';
import {
  generateStimulusSet,
  buildGrid,
  buildStimulusSet,
} from '../src/game/stimuli.js';

const B = BLACK;
const W = WHITE;

describe('largestRegion (4-way connectivity)', () => {
  it('finds the largest of several black blobs', () => {
    // Two black blobs: a single cell (size 1) and an L of size 3.
    const grid = [
      [B, W, W],
      [W, W, B],
      [W, B, B],
    ];
    expect(largestRegion(grid, B).size).toBe(3);
  });

  it('does NOT connect diagonally', () => {
    // A checkerboard: every black cell touches others only diagonally, so each
    // black region has size 1.
    const grid = [
      [B, W, B],
      [W, B, W],
      [B, W, B],
    ];
    expect(largestRegion(grid, B).size).toBe(1);
    expect(largestRegion(grid, W).size).toBe(1);
  });

  it('returns size 0 for an absent color', () => {
    const grid = [
      [B, B],
      [B, B],
    ];
    expect(largestRegion(grid, W).size).toBe(0);
  });
});

describe('scoreGrid', () => {
  it('computes the correct ratio from largest regions, not counts', () => {
    // Black: a connected vertical bar of 3 in column 0 (largest black = 3).
    // White: the remaining 6 cells form one connected region (largest = 6).
    const grid = [
      [B, W, W],
      [B, W, W],
      [B, W, W],
    ];
    const s = scoreGrid(grid);
    expect(s.blackScore).toBe(3);
    expect(s.whiteScore).toBe(6);
    expect(s.correctRatio).toBeCloseTo(3 / 9, 10);
  });

  it('all-black grid -> ratio 1', () => {
    const grid = [
      [B, B],
      [B, B],
    ];
    expect(scoreGrid(grid).correctRatio).toBe(1);
  });

  it('all-white grid -> ratio 0', () => {
    const grid = [
      [W, W],
      [W, W],
    ];
    expect(scoreGrid(grid).correctRatio).toBe(0);
  });

  it('throws on an empty grid', () => {
    expect(() => scoreGrid([])).toThrow();
  });
});

describe('counting divergence metric', () => {
  it('counting is accurate (divergence ~0) when regions match counts', () => {
    // 3 black cells, all in one region; 6 white cells, all in one region.
    // countRatio = 3/9; correctRatio = 3/9 -> divergence 0.
    const grid = [
      [B, W, W],
      [B, W, W],
      [B, W, W],
    ];
    const s = scoreGrid(grid);
    expect(s.countRatio).toBeCloseTo(3 / 9, 10);
    expect(s.correctRatio).toBeCloseTo(3 / 9, 10);
    expect(s.divergence).toBeCloseTo(0, 10);
  });

  it('counting is misleading when black is fragmented vs one white blob', () => {
    // Many scattered black cells (high count) but each black region is small,
    // while white forms a large connected region -> true score favors white
    // more than counting would.
    const grid = [
      [B, W, B, W],
      [W, W, W, W],
      [B, W, B, W],
      [W, W, W, W],
    ];
    const s = scoreGrid(grid);
    // 4 black cells out of 16 -> countRatio 0.25; each black region size 1,
    // white is one big region of 12 -> correctRatio = 1/13 < 0.25.
    expect(s.countRatio).toBeCloseTo(0.25, 10);
    expect(s.correctRatio).toBeCloseTo(1 / 13, 10);
    expect(s.divergence).toBeLessThan(0); // rule favors white more than counting
    expect(s.absDivergence).toBeGreaterThan(0.1);
  });

  it('divergence flips sign under color inversion', () => {
    const rng = makeRng('div-flip');
    for (let i = 0; i < 30; i++) {
      const g = generateGrid(6, 6, { blackProbability: 0.5, rng });
      const d = scoreGrid(g).divergence;
      const dFlipped = scoreGrid(flipGrid(g)).divergence;
      expect(dFlipped).toBeCloseTo(-d, 10);
    }
  });
});

describe('flip symmetry', () => {
  it('flipGrid inverts the correct ratio (ratio_flipped === 1 - ratio)', () => {
    const rng = makeRng('flip-test');
    for (let i = 0; i < 50; i++) {
      const g = generateGrid(5, 5, { blackProbability: 0.5, rng });
      const r = scoreGrid(g).correctRatio;
      const rFlipped = scoreGrid(flipGrid(g)).correctRatio;
      expect(rFlipped).toBeCloseTo(1 - r, 10);
    }
  });

  it('flipGrid does not mutate its input', () => {
    const g = [
      [B, W],
      [W, B],
    ];
    const copy = g.map((row) => [...row]);
    flipGrid(g);
    expect(g).toEqual(copy);
  });
});

describe('serialize / deserialize', () => {
  it('round-trips a grid', () => {
    const g = [
      [B, W, B],
      [W, W, B],
    ];
    const str = serializeGrid(g);
    expect(str).toBe('101001');
    expect(deserializeGrid(str, 2, 3)).toEqual(g);
  });
});

describe('rng reproducibility', () => {
  it('same seed yields identical sequences', () => {
    const a = makeRng('abc');
    const b = makeRng('abc');
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = makeRng('abc');
    const b = makeRng('xyz');
    expect(a()).not.toBe(b());
  });
});

describe('generateStimulusSet', () => {
  it('is reproducible for a given seed and produces nTrials trials', () => {
    const config = { seed: 'set-test', rows: 6, cols: 6, nTrials: 20 };
    const set1 = generateStimulusSet(config);
    const set2 = generateStimulusSet(config);
    expect(set1.length).toBe(20);
    expect(set1.map((t) => t.gridString)).toEqual(set2.map((t) => t.gridString));
  });

  it('spreads correct ratios across a wide range when binning', () => {
    const set = generateStimulusSet({
      seed: 'spread-test',
      rows: 6,
      cols: 6,
      nTrials: 30,
      spreadAcrossBins: true,
    });
    const ratios = set.map((t) => t.correctRatio);
    expect(Math.min(...ratios)).toBeLessThan(0.35);
    expect(Math.max(...ratios)).toBeGreaterThan(0.65);
  });

  it('tiles by divergence, covering both signs', () => {
    const set = generateStimulusSet({
      seed: 'div-tile',
      rows: 7,
      cols: 7,
      nTrials: 30,
      tileBy: 'divergence',
      varyDensity: true,
      oversampleFactor: 40,
    });
    const divs = set.map((t) => t.divergence);
    expect(Math.min(...divs)).toBeLessThan(0);
    expect(Math.max(...divs)).toBeGreaterThan(0);
    // every trial carries the counting metrics
    expect(set.every((t) => typeof t.countRatio === 'number')).toBe(true);
  });

  it('supports 2-D tiling across two metrics', () => {
    const set = generateStimulusSet({
      seed: '2d-tile',
      rows: 7,
      cols: 7,
      nTrials: 24,
      tileBy: ['countRatio', 'divergence'],
      nBins: [5, 5],
      varyDensity: true,
      oversampleFactor: 50,
    });
    expect(set.length).toBeGreaterThan(0);
    expect(set.length).toBeLessThanOrEqual(24);
  });

  it('constructs a grid hitting a target divergence (within the feasible range)', () => {
    for (const target of [-0.35, -0.2, 0.0, 0.2, 0.35]) {
      const { grid, metrics } = buildGrid(9, 9, { divergence: target }, {
        rng: makeRng(`build-${target}`),
        maxIters: 8000,
        tolerance: 0.01,
        restarts: 5,
      });
      // achieved divergence should match the recomputed score and be close to target
      expect(scoreGrid(grid).divergence).toBeCloseTo(metrics.divergence, 10);
      expect(Math.abs(metrics.divergence - target)).toBeLessThan(0.06);
    }
  });

  it('buildStimulusSet spans a wide divergence range (beyond random sampling)', () => {
    const set = buildStimulusSet({
      seed: 'build-set',
      rows: 9,
      cols: 9,
      nTrials: 12,
      tileBy: 'divergence',
      ranges: { divergence: [-0.4, 0.4] },
      maxIters: 8000,
    });
    const divs = set.map((t) => t.divergence);
    // far wider than the ~±0.24 random sampling reaches
    expect(Math.min(...divs)).toBeLessThan(-0.33);
    expect(Math.max(...divs)).toBeGreaterThan(0.33);
  });

  it('uses explicit grids verbatim when provided', () => {
    const grids = [
      [
        [B, B],
        [W, W],
      ],
    ];
    const set = generateStimulusSet({ seed: 'x', grids });
    expect(set.length).toBe(1);
    expect(set[0].gridString).toBe('1100');
  });
});
