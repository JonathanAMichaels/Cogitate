# Cogitate

A simple, instrumented judgment game for studying how people **evaluate novel
positions** and **learn and generalize hidden rules** — inspired by complex
games like chess, distilled to a minimal task.

**▶ Live:** https://jonathanamichaels.github.io/Cogitate/
(auto-deploys from `main` via GitHub Actions; data → DataPipe → OSF.)

## The task

On each trial the participant sees a grid of black/white squares and judges the
black-vs-white "balance" on a gradient slider (white → black). They are **never
told the rule**.

**Hidden rule:** each color's score is the size of its **largest contiguous
region** (orthogonal / 4-way connectivity — diagonals do *not* connect). The
correct slider position is:

```
correctRatio = blackScore / (blackScore + whiteScore)
```

After responding, feedback shows the correct slider position (a green marker) —
the rule itself is never revealed visually. A brief blank pause follows, then the
next trial.

Built on [jsPsych](https://www.jspsych.org/) v8 with a custom `grid-slider`
plugin. The core game logic is framework-agnostic and unit-tested.

## Setup

Requires [Node.js](https://nodejs.org/) (v18+).

```bash
npm install
```

## Commands

| Command         | What it does                                              |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | Start the dev server (hot reload) — play at the printed URL |
| `npm run build` | Build static files into `dist/`                          |
| `npm run preview` | Serve the built `dist/` locally                        |
| `npm test`      | Run the Vitest unit tests (connectivity / scoring / flip)|

## Configuring the experiment

All parameters live in [`src/config.js`](src/config.js): grid size, number of
trials, feedback/pause timing, the RNG `seed`, and the DataPipe experiment ID.
Because stimulus generation is seeded, a given `seed` reproduces the exact same
stimulus set on every machine and participant — change the seed to get a fresh
(but still reproducible) set.

You can also pass an explicit, hand-curated list of grids to
`generateStimulusSet` via `config.grids`.

### The counting-divergence metric & tiling the stimulus space

Every grid carries a **divergence** metric: how far the true (largest-region)
score departs from what *simply counting squares* would give.

```
countRatio = blackCount / totalCells        # the naive "count the squares" answer
correctRatio = blackScore / (black + white) # the hidden-rule answer
divergence = correctRatio - countRatio       # ~0: counting works · large: counting misleads
```

This is the dimension that separates "has learned the rule" from "is just
counting." `generateStimulusSet` can **tile the stimulus space** across any
metric so trials cover it evenly:

- `tileBy: 'divergence'` (default) — even coverage of misleading↔accurate grids
- `tileBy: 'correctRatio'` — even coverage of the slider scale
- `tileBy: 'countRatio'` — even coverage of black-square proportion
- `tileBy: ['countRatio', 'divergence']` — 2-D tiling (set `nBins: [nx, ny]`)

There are two generation methods (set `method` in the config):

- **`'construct'`** (default) — *builds* grids at evenly spaced targets across the
  tiled range using local search (`buildGrid` / `buildStimulusSet`), so you can
  reach essentially any divergence the geometry allows. Tune with `ranges`,
  `nBins` (lattice resolution for 2-D), `maxIters`, `tolerance`.
- **`'sample'`** — draws random grids and bins them. Limited to what sampling
  happens to reach (~±0.24 divergence for random 9×9). Tune with `varyDensity`,
  `densityRange`, `oversampleFactor`.

**Divergence has a geometric ceiling.** Fragmenting one color requires the other
color as separators, which fights the count term, so |divergence| tops out at
about **±0.41 on a 9×9** (≈±0.44 at 12×12, ≈±0.47 at 16×16). Targets beyond the
ceiling resolve to the closest reachable grid. Use a larger grid to go higher.

With `logStimulusSummary: true` the set's coverage (min/max/mean of the tiled
metric) is printed to the console, so coverage is never a mystery.

`countRatio` and `divergence` are recorded on every trial in the data.

### Piloting overlay

Set `debug: true` in the config to show a researcher-only readout of
`count · true · div` on each trial (it reveals the answer, so keep it `false`
for real participants).

## Code layout

```
src/
  config.js                 # all experiment parameters
  main.js                   # builds + runs the jsPsych timeline
  game/                     # framework-agnostic core (unit-tested)
    rng.js                  # seedable PRNG (reproducible stimuli)
    connectivity.js         # largestRegion() — 4-way flood fill
    scoring.js              # scoreGrid() -> scores + correctRatio
    grid.js                 # generate / flip / (de)serialize grids
    stimuli.js              # generateStimulusSet()
  plugin/
    plugin-grid-slider.js   # custom jsPsych plugin (grid + slider + feedback)
  data.js                   # DataPipe upload + local CSV download
test/
  scoring.test.js           # hand-computed grids, edge cases, flip symmetry
```

## Data

Every session always triggers a local **CSV download** as a safety net. Each
trial row includes: serialized `grid`, `black_score`, `white_score`,
`correct_ratio`, `count_ratio`, `divergence`, `response`, `signed_error`,
`abs_error`, `rt`, `timed_out`, `trial_points`, `total_points`, `condition`,
`is_flip`, `flip_of`, `timestamp`, plus session metadata (`subject_id`, `seed`,
grid dimensions).

### Online logging (DataPipe → OSF)

1. Create a free [OSF](https://osf.io/) account and a project for this study.
2. Create an experiment at [pipe.jspsych.org](https://pipe.jspsych.org), link it
   to the OSF project, and enable data collection.
3. Put the experiment ID in `dataPipeExperimentId` in `src/config.js`.
4. `npm run build` and host `dist/` on any static host (GitHub Pages, Netlify).
   Each completed session uploads its CSV to your OSF project automatically.

## Research & analysis

- **[docs/SYNTHESIS.md](docs/SYNTHESIS.md)** — the theoretical framework: how this
  task probes structure learning, how the single-tile-flip manipulation works,
  and the predictions / models that follow.
- **[docs/EXPERIMENTAL_PLAN.md](docs/EXPERIMENTAL_PLAN.md)** — the planned studies,
  the literature gap they fill, our contribution, and the analysis/power plan.
- **[src/game/flips.js](src/game/flips.js)** — the flip-informativeness engine:
  scores every single-tile flip by how much it dissociates the counting heuristic
  from the true rule (for selecting flips in the next experimental phase).
- **[analysis/](analysis/)** — Python pipeline that simulates learner agents and
  fits the structure-learning weight `w(t)`, validating (via parameter recovery /
  power analysis) that the design can measure learning in people. Run
  `node scripts/export-stimuli.js` then see `analysis/README.md`.

## Roadmap (not yet wired into the default timeline)

- **Flip phase:** re-present earlier grids color-inverted and re-ask. The hooks
  exist now — `flipGrid()` plus the `is_flip` / `flip_of` data fields. Note that
  `correctRatio` of a flipped grid is exactly `1 − correctRatio` of the original.
- **Region-highlight feedback mode:** the largest regions are already computed
  and returned by `scoreGrid()`, ready to draw for a "tutorial" condition.
