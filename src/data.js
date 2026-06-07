// Data persistence: online via DataPipe -> OSF, with a local CSV download that
// always runs as a fallback so no session is ever lost.

import jsPsychPipe from '@jspsych-contrib/plugin-pipe';

/**
 * A jsPsych trial that uploads the collected data to DataPipe (which stores it
 * in the linked OSF project). Returns null when no experiment ID is configured
 * so the caller can skip it.
 *
 * @param {object} jsPsych - the jsPsych instance
 * @param {object} config - CONFIG object
 * @param {string} subjectId - unique filename stem for this session
 * @returns {object|null} a jsPsych timeline node, or null to skip
 */
export function makePipeTrial(jsPsych, config, subjectId) {
  if (!config.dataPipeExperimentId) return null;
  return {
    type: jsPsychPipe,
    action: 'save',
    experiment_id: config.dataPipeExperimentId,
    filename: `${subjectId}.csv`,
    data_string: () => jsPsych.data.get().csv(),
  };
}

/**
 * Trigger a local CSV download of all collected data.
 * @param {object} jsPsych
 * @param {string} subjectId
 */
export function saveLocalCsv(jsPsych, subjectId) {
  jsPsych.data.get().localSave('csv', `${subjectId}.csv`);
}
