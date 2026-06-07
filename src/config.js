// Single source of truth for all experiment parameters.
// Tweak here to reconfigure the study without touching the timeline code.

export const CONFIG = {
  // --- Stimulus set ---------------------------------------------------------
  seed: 'cogitate-pilot-v1', // change to regenerate a fresh (but reproducible) set
  rows: 9,
  cols: 9,
  nTrials: 30,
  blackProbability: 0.5,

  // --- Stimulus tiling ------------------------------------------------------
  // Tile the stimulus space across a metric so trials cover it evenly.
  //   tileBy: 'correctRatio' | 'countRatio' | 'divergence' | 'absDivergence'
  //           (or a 2-element array for 2-D tiling, e.g.
  //            ['countRatio', 'divergence'])
  // 'divergence' = how much the true (largest-region) score departs from what
  // simply counting squares would give. ~0 means counting is accurate; large
  // |divergence| means counting is misleading.
  //
  // method:
  //   'construct' — BUILD grids at evenly spaced targets via local search, so we
  //                 can reach any divergence the geometry allows (default).
  //   'sample'    — draw random grids and bin them (limited to what sampling
  //                 happens to reach, ~±0.24 divergence for random 9x9).
  method: 'construct',
  tileBy: 'divergence',
  // Target range to span. ~±0.4 is the geometric ceiling on a 9x9 (a bit higher
  // on larger grids); targets beyond it resolve to the closest reachable grid.
  ranges: { divergence: [-0.4, 0.4] },
  nBins: 10, // lattice resolution per dimension (2-D construct / sample binning)

  // Local-search tuning (construct mode).
  maxIters: 6000,
  tolerance: 0.01,

  // Sampling tuning (only used when method === 'sample').
  spreadAcrossBins: true,
  varyDensity: true,
  densityRange: [0.35, 0.65],
  oversampleFactor: 40,

  logStimulusSummary: true, // console.info the set's coverage (piloting)

  // Show a researcher-only overlay of count/true/divergence on each trial.
  debug: false,

  // --- Trial timing / behavior ---------------------------------------------
  showFeedback: true,
  feedbackDuration: 1600, // ms the correct-answer marker stays up
  itiDuration: 600, // ms blank pause between trials
  timeLimit: 5000, // ms to respond before the trial times out
  pointsScale: 100, // points = round(abs_error * scale); timeout = scale (max)

  // --- Data logging ---------------------------------------------------------
  // DataPipe (https://pipe.jspsych.org) experiment ID, linked to an OSF project.
  // Leave null to skip the online upload (local CSV download still happens).
  dataPipeExperimentId: null,
  localSaveCsv: true,
};
