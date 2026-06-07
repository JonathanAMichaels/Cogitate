import { describe, it, expect } from 'vitest';
import { BLACK, WHITE } from '../src/game/connectivity.js';
import { scoreGrid } from '../src/game/scoring.js';
import {
  flipEffects,
  rankFlips,
  mostInformativeFlip,
  selectFlipByInformativeness,
  summarizeFlips,
} from '../src/game/flips.js';

const B = BLACK;
const W = WHITE;

describe('flipEffects', () => {
  it('reports one effect per cell with correct count deltas', () => {
    const grid = [
      [B, W],
      [W, B],
    ];
    const eff = flipEffects(grid);
    expect(eff.length).toBe(4);
    for (const e of eff) {
      // flipping to black raises count, to white lowers it, by 1/N
      expect(e.deltaCount).toBeCloseTo((e.toColor === B ? 1 : -1) / 4, 12);
    }
  });

  it('deltaCorrect matches an independent rescore of the flipped grid', () => {
    const grid = [
      [B, B, W],
      [W, B, W],
      [B, W, B],
    ];
    const base = scoreGrid(grid).correctRatio;
    for (const e of flipEffects(grid)) {
      const g2 = grid.map((row) => [...row]);
      g2[e.r][e.c] = e.toColor;
      const recomputed = scoreGrid(g2).correctRatio - base;
      expect(e.deltaCorrect).toBeCloseTo(recomputed, 12);
    }
  });

  it('does not mutate the input grid', () => {
    const grid = [
      [B, W],
      [W, B],
    ];
    const copy = grid.map((row) => [...row]);
    flipEffects(grid);
    expect(grid).toEqual(copy);
  });
});

describe('articulation / bridge flips are highly diagnostic', () => {
  it('flipping a bridge cell that splits the largest region is the top flip', () => {
    // "Dumbbell": two black bars joined by a single black bridge at (1,2).
    const grid = [
      [B, B, B, B, B],
      [W, W, B, W, W],
      [B, B, B, B, B],
    ];
    // base: all black connected via the bridge -> blackScore 11; white in two
    // isolated pairs -> whiteScore 2; correct = 11/13.
    const base = scoreGrid(grid);
    expect(base.blackScore).toBe(11);
    expect(base.whiteScore).toBe(2);

    const top = mostInformativeFlip(grid);
    expect(top.r).toBe(1);
    expect(top.c).toBe(2); // the bridge cell
    expect(top.isArticulation).toBe(true);
    // flipping it splits black into two bars of 5 -> blackScore 5
    expect(top.deltaBlackScore).toBe(-6);
    // count barely moves (−1/15) but the true answer drops a lot
    expect(Math.abs(top.deltaCount)).toBeCloseTo(1 / 15, 12);
    expect(top.diagnosticity).toBeGreaterThan(0.25);
  });
});

describe('uninformative flips in a uniform grid', () => {
  it('every flip in an all-black grid has ~zero diagnosticity', () => {
    const grid = [
      [B, B, B],
      [B, B, B],
      [B, B, B],
    ];
    for (const e of flipEffects(grid)) {
      // count and structure move together -> not diagnostic
      expect(e.diagnosticity).toBeCloseTo(0, 10);
    }
    expect(summarizeFlips(grid).nArticulationPoints).toBe(0);
  });
});

describe('selection helpers', () => {
  it('rankFlips is sorted descending by diagnosticity', () => {
    const grid = [
      [B, B, B, B, B],
      [W, W, B, W, W],
      [B, B, B, B, B],
    ];
    const ranked = rankFlips(grid);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].diagnosticity).toBeGreaterThanOrEqual(ranked[i].diagnosticity);
    }
  });

  it('selectFlipByInformativeness(target=0) returns a non-diagnostic flip', () => {
    const grid = [
      [B, B, B, B, B],
      [W, W, B, W, W],
      [B, B, B, B, B],
    ];
    const e = selectFlipByInformativeness(grid, 0);
    expect(e.diagnosticity).toBeLessThan(0.05);
  });
});
