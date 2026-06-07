// Experiment entry point: builds and runs the jsPsych timeline.

import { initJsPsych } from 'jspsych';
import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import surveyText from '@jspsych/plugin-survey-text';
import 'jspsych/css/jspsych.css';
import './styles.css';

import { CONFIG } from './config.js';
import { generateStimulusSet } from './game/stimuli.js';
import GridSliderPlugin from './plugin/plugin-grid-slider.js';
import { makePipeTrial, saveLocalCsv } from './data.js';

const subjectId = `cogitate-${jsId()}`;

function jsId() {
  // Short URL-safe id; avoids leaning on Math.random alone for collisions by
  // mixing in the page-load time.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}

const jsPsych = initJsPsych({
  on_finish: () => {
    if (CONFIG.localSaveCsv) saveLocalCsv(jsPsych, subjectId);
  },
});

// Record session-level metadata on every row for easy grouping in analysis.
jsPsych.data.addProperties({
  subject_id: subjectId,
  seed: CONFIG.seed,
  grid_rows: CONFIG.rows,
  grid_cols: CONFIG.cols,
});

const timeline = [];

// --- Instructions (rule-agnostic) ------------------------------------------
timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="gs-instructions">
      <h1>Welcome</h1>
      <p>You will see a series of images made of black and white squares.</p>
      <p>Your job is to <strong>assign a score</strong> to each image by clicking
      on the bar shown below it.</p>
      <p>You have <strong>5 seconds</strong> per image. You collect penalty
      points based on how far off your score is &mdash; try to keep your total as
      low as possible.</p>
      <p>Click <strong>Begin</strong> when you're ready.</p>
    </div>
  `,
  choices: ['Begin'],
});

// --- Main trials ------------------------------------------------------------
const stimuli = generateStimulusSet(CONFIG);

for (const stim of stimuli) {
  timeline.push({
    type: GridSliderPlugin,
    grid: stim.grid,
    correctRatio: stim.correctRatio,
    blackScore: stim.blackScore,
    whiteScore: stim.whiteScore,
    countRatio: stim.countRatio,
    divergence: stim.divergence,
    debug: CONFIG.debug,
    showFeedback: CONFIG.showFeedback,
    feedbackDuration: CONFIG.feedbackDuration,
    itiDuration: CONFIG.itiDuration,
    timeLimit: CONFIG.timeLimit,
    pointsScale: CONFIG.pointsScale,
    condition: 'main',
  });
}

// --- Debrief ----------------------------------------------------------------
timeline.push({
  type: surveyText,
  preamble: '<p>Almost done! One quick question:</p>',
  questions: [
    {
      prompt: 'Did you notice any rule or pattern for the correct answer? Please describe it.',
      rows: 4,
      columns: 60,
      name: 'noticed_rule',
    },
  ],
});

// --- Save online (DataPipe -> OSF) when configured --------------------------
const pipeTrial = makePipeTrial(jsPsych, CONFIG, subjectId);
if (pipeTrial) timeline.push(pipeTrial);

// --- Final thank-you --------------------------------------------------------
timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="gs-instructions">
      <h1>Thank you!</h1>
      <p>Your responses have been recorded. You may close this window.</p>
    </div>
  `,
  choices: ['Finish'],
});

jsPsych.run(timeline);
