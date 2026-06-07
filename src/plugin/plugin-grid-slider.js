// Custom jsPsych plugin: render a black/white grid + a white->black gradient
// bar. The participant answers with a single click on the bar (no submit, no
// default thumb). Each trial is timed; points accumulate by how far off the
// answer is (lower is better). Feedback marks the correct position prominently
// without revealing the underlying rule.

import { ParameterType } from 'jspsych';
import { serializeGrid } from '../game/grid.js';

// Compact number formatter for the debug overlay (e.g. 0.27, +0.26).
function fmt(v, signed = false) {
  if (v == null) return '–';
  const s = v.toFixed(2);
  return signed && v >= 0 ? `+${s}` : s;
}

const info = {
  name: 'grid-slider',
  version: '2.0.0',
  parameters: {
    /** 2D array of cells (1 = black, 0 = white). */
    grid: { type: ParameterType.OBJECT, default: undefined },
    /** Correct slider position in [0, 1] = black / (black + white). */
    correctRatio: { type: ParameterType.FLOAT, default: undefined },
    blackScore: { type: ParameterType.INT, default: null },
    whiteScore: { type: ParameterType.INT, default: null },
    /** Counting metrics (for logging + optional debug overlay). */
    countRatio: { type: ParameterType.FLOAT, default: null },
    divergence: { type: ParameterType.FLOAT, default: null },
    /** Show a researcher-only overlay of the metrics (piloting aid). */
    debug: { type: ParameterType.BOOL, default: false },
    /** Optional instruction shown below the grid. */
    prompt: { type: ParameterType.HTML_STRING, default: '' },
    /** Whether to show feedback after the response. */
    showFeedback: { type: ParameterType.BOOL, default: true },
    /** How long the feedback marker stays visible (ms). */
    feedbackDuration: { type: ParameterType.INT, default: 1600 },
    /** Blank inter-trial pause after feedback (ms). */
    itiDuration: { type: ParameterType.INT, default: 600 },
    /** Response time limit (ms). On timeout the max penalty is applied. */
    timeLimit: { type: ParameterType.INT, default: 5000 },
    /** Penalty scale: points = round(abs_error * pointsScale); timeout = max. */
    pointsScale: { type: ParameterType.INT, default: 100 },
    /** Pass-through metadata for analysis. */
    condition: { type: ParameterType.STRING, default: 'main' },
    isFlip: { type: ParameterType.BOOL, default: false },
    flipOf: { type: ParameterType.INT, default: null },
  },
  data: {
    rows: { type: ParameterType.INT },
    cols: { type: ParameterType.INT },
    grid: { type: ParameterType.STRING },
    black_score: { type: ParameterType.INT },
    white_score: { type: ParameterType.INT },
    correct_ratio: { type: ParameterType.FLOAT },
    count_ratio: { type: ParameterType.FLOAT },
    divergence: { type: ParameterType.FLOAT },
    response: { type: ParameterType.FLOAT },
    signed_error: { type: ParameterType.FLOAT },
    abs_error: { type: ParameterType.FLOAT },
    rt: { type: ParameterType.INT },
    timed_out: { type: ParameterType.BOOL },
    trial_points: { type: ParameterType.INT },
    total_points: { type: ParameterType.INT },
    condition: { type: ParameterType.STRING },
    is_flip: { type: ParameterType.BOOL },
    flip_of: { type: ParameterType.INT },
    timestamp: { type: ParameterType.INT },
  },
};

class GridSliderPlugin {
  static info = info;

  constructor(jsPsych) {
    this.jsPsych = jsPsych;
  }

  trial(displayElement, trial) {
    const rows = trial.grid.length;
    const cols = trial.grid[0].length;

    // Running total carried in from prior trials' recorded points.
    const prevTotal = this.jsPsych.data.get().select('trial_points').sum() || 0;

    let cellsHtml = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cls = trial.grid[r][c] === 1 ? 'gs-cell gs-black' : 'gs-cell gs-white';
        cellsHtml += `<div class="${cls}"></div>`;
      }
    }

    displayElement.innerHTML = `
      <div class="gs-container">
        <div class="gs-topbar">
          <div class="gs-score">Points: <span id="gs-total">${prevTotal}</span></div>
          <div class="gs-timerbar"><div id="gs-timerfill" class="gs-timerfill"></div></div>
        </div>
        <div class="gs-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
          ${cellsHtml}
        </div>
        ${trial.prompt ? `<div class="gs-prompt">${trial.prompt}</div>` : ''}
        ${
          trial.debug
            ? `<div class="gs-debug">count ${fmt(trial.countRatio)} · true ${fmt(
                trial.correctRatio,
              )} · div ${fmt(trial.divergence, true)}</div>`
            : ''
        }
        <div class="gs-bar" id="gs-bar">
          <div id="gs-response-marker" class="gs-marker gs-resp" hidden></div>
          <div id="gs-correct-marker" class="gs-marker gs-correct" hidden>
            <span class="gs-correct-arrow"></span>
          </div>
        </div>
        <div id="gs-feedback" class="gs-feedback"></div>
      </div>
    `;

    const bar = displayElement.querySelector('#gs-bar');
    const respMarker = displayElement.querySelector('#gs-response-marker');
    const correctMarker = displayElement.querySelector('#gs-correct-marker');
    const feedback = displayElement.querySelector('#gs-feedback');
    const totalEl = displayElement.querySelector('#gs-total');
    const timerFill = displayElement.querySelector('#gs-timerfill');

    const startTime = performance.now();
    let answered = false;

    // Depleting countdown bar: shrinks to empty and shifts green -> red over the
    // time limit, so "running out of time" is obvious. Uses the Web Animations
    // API (not a CSS transition) so it fires reliably on every trial, not just
    // the first — CSS transitions could be skipped when the fresh element's
    // initial state wasn't painted before the value changed.
    const timerAnim = timerFill.animate(
      [
        { width: '100%', backgroundColor: '#2ec27e' },
        { width: '0%', backgroundColor: '#e23b3b' },
      ],
      { duration: trial.timeLimit, easing: 'linear', fill: 'forwards' },
    );
    const freezeTimer = () => timerAnim.pause();

    const positionMarker = (el, fraction) => {
      el.style.left = `${fraction * 100}%`;
    };

    const finish = (data) => {
      bar.removeEventListener('click', onClick);
      this.jsPsych.finishTrial(data);
    };

    const showFeedbackThenAdvance = (data) => {
      totalEl.textContent = data.total_points;
      if (!trial.showFeedback) {
        finish(data);
        return;
      }
      positionMarker(correctMarker, trial.correctRatio);
      correctMarker.hidden = false;
      feedback.textContent = data.timed_out
        ? `Too slow  ·  +${data.trial_points}`
        : `+${data.trial_points}`;

      this.jsPsych.pluginAPI.setTimeout(() => {
        displayElement.innerHTML = '';
        this.jsPsych.pluginAPI.setTimeout(() => finish(data), trial.itiDuration);
      }, trial.feedbackDuration);
    };

    const baseData = () => ({
      rows,
      cols,
      grid: serializeGrid(trial.grid),
      black_score: trial.blackScore,
      white_score: trial.whiteScore,
      correct_ratio: trial.correctRatio,
      count_ratio: trial.countRatio,
      divergence: trial.divergence,
      condition: trial.condition,
      is_flip: trial.isFlip,
      flip_of: trial.flipOf,
      timestamp: Date.now(),
    });

    const onAnswer = (fraction, rt) => {
      if (answered) return;
      answered = true;
      this.jsPsych.pluginAPI.clearAllTimeouts();
      freezeTimer();

      const signedError = fraction - trial.correctRatio;
      const absError = Math.abs(signedError);
      const trialPoints = Math.round(absError * trial.pointsScale);

      positionMarker(respMarker, fraction);
      respMarker.hidden = false;

      showFeedbackThenAdvance({
        ...baseData(),
        response: fraction,
        signed_error: signedError,
        abs_error: absError,
        rt,
        timed_out: false,
        trial_points: trialPoints,
        total_points: prevTotal + trialPoints,
      });
    };

    const onTimeout = () => {
      if (answered) return;
      answered = true;
      freezeTimer();
      const trialPoints = trial.pointsScale; // max penalty for no response
      showFeedbackThenAdvance({
        ...baseData(),
        response: null,
        signed_error: null,
        abs_error: null,
        rt: null,
        timed_out: true,
        trial_points: trialPoints,
        total_points: prevTotal + trialPoints,
      });
    };

    const onClick = (e) => {
      if (answered) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onAnswer(fraction, Math.round(performance.now() - startTime));
    };

    bar.addEventListener('click', onClick);
    this.jsPsych.pluginAPI.setTimeout(onTimeout, trial.timeLimit);
  }
}

export default GridSliderPlugin;
