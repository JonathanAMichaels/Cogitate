# Cogitate — experimental plan

*Concrete studies, the literature gap they fill, and our contribution. Companion
to the theory in [`SYNTHESIS.md`](SYNTHESIS.md) and the annotated bibliography in
`papers/README.md`. Author-year citations point to that library.*

---

## 1. One-sentence motivation

How do people learn to **evaluate** novel situations — to assign value to a state
whose scoring rule they were never told — and how does **information about how the
state changes** accelerate that learning? Cogitate makes this measurable: estimate
a grid's hidden score (size of the largest contiguous same-color region) from
feedback alone, with the count of squares as a tempting but wrong heuristic.

---

## 2. The gap

Four mature literatures each capture *part* of this problem but none captures the
whole, and none offers a single controllable handle on it.

1. **Rule/structure learning is studied as discrete classification, not continuous
   valuation.** The canonical hidden-rule paradigms ask "does this item follow the
   rule?" or "which category/bucket?" — Zendo/Eleusis, the Game of Hidden Rules
   (Förstā 2022, 2023), card-sorting insight (Öllinger 2023), task-set learning
   (Collins & Frank 2013), latent-cause inference (Gershman 2010, 2015), structure
   learning (Tenenbaum 2011; Tervo 2016; Niv 2019). These tell us how people infer
   *categorical* structure, but not how they learn a **graded value function** over
   states — the thing that matters for evaluating positions in games like chess.

2. **Continuous magnitude estimation is studied with rules that reward counting.**
   Numerosity / ensemble-perception psychophysics has people estimate proportions
   on a continuum, but the correct answer *is* the count/density. There is no
   established task where continuous estimation must override an obvious counting
   heuristic in favor of a **non-linear, topological** property.

3. **Intervention/active-learning is studied on abstract causal graphs.** The value
   of acting-vs-observing and of choosing informative queries is well established
   (Lagnado & Sloman 2004; Bramley 2015, 2017; Coenen 2015; Gureckis & Markant
   2012; Nelson 2010; Meder 2020), but in causal-graph worlds, not as a
   **perceptual valuation task with a computable, parametric "informativeness" of
   each possible state change.**

4. **Neural-representation work rarely binds a controllable task variable to both
   learning dynamics and geometry.** Representational geometry of learned structure
   (Bernardi 2020; Flesch 2022; Chung 2021), cognitive-map/state codes (Schuck
   2016; Whittington 2020 TEM; Stachenfeld 2017; Samborska 2022), learning dynamics
   (Saxe 2014/2019; Lee 2024), and meta-RL accounts (Wang 2018; Botvinick 2020) are
   each rich, but they are seldom driven by a single scalar that simultaneously
   sets difficulty, defines intervention value, and predicts representational
   separation.

**The missing object** is a task with *one computable quantity* that ties all four
together. We have it: **divergence** = `correctRatio − countRatio` (true score vs.
counting answer).

---

## 3. Our contribution

1. **A continuous value-estimation task with a topological hidden rule** — learning
   to *evaluate*, not classify, where the obvious heuristic (counting) is precisely
   wrong in a controllable way.
2. **`divergence` as a single, constructable axis** that (a) sets difficulty, (b)
   makes trials diagnostic, and (c) is predicted to separate "count" from
   "structure" in neural/representational space. We can **build grids to any target
   divergence** (constructive generator) up to the geometric ceiling (~±0.4 on
   9×9), not just whatever random sampling yields.
3. **A computable informativeness for single-state changes** — the flip engine
   scores every single-tile flip by `diagnosticity = |Δcorrect − Δcount|`, turning
   the "informative intervention" idea into a parametric, selectable manipulation.
4. **A validated measurement model.** The mixture weight `w(t)` (reliance on the
   rule) is recoverable from realistic data — parameter-recovery shows the 30-trial
   design measures `w` to RMSE≈0.08 and detects insight change-points (99%, within
   ±3 trials 92%). The instrument is powered *before* data collection.
5. **One paradigm spanning three strands** — structure inference, intervention/
   active learning, and neural representational geometry (brains *and* networks) —
   enabling direct brain↔model↔behavior comparison on the same task.

---

## 4. Core hypotheses (see SYNTHESIS §5 for the full list)

- **H1 (count-first):** early responses track `countRatio`; `w₀ ≈ 0`.
- **H2 (diagnostic trials drive learning):** error reduction is carried by
  high-|divergence| trials.
- **H3 (insight):** many learners show a *change-point* in `w(t)`, not smooth drift
  (Saxe; Lee 2024).
- **H4 (informative flips accelerate):** high-diagnosticity single-tile flips
  speed time-to-insight and improve retention vs. uninformative flips (Markant &
  Gureckis 2010; Gureckis & Markant 2012).
- **H5 (transfer/inversion):** rule-learners generalize to new sizes and to
  color-inversion (`divergence → −divergence`); pure counters fail inversion.
- **H6 (geometry tracks behavior):** in a trained network (later, neurally), the
  rule axis abstracts and orthogonalizes from the count axis as `w` rises
  (Bernardi 2020; Flesch 2022).

---

## 5. Experiments

### Experiment 1 — Baseline learning & measurement *(runs on the current build)*
- **Question:** Do people learn the rule from feedback alone, and can we measure
  the trajectory? (H1–H3)
- **Design:** single session, ~30–60 divergence-tiled trials, feedback = correct
  slider position. Debrief asks what rule they noticed.
- **IV (within):** trial divergence (tiled). **DVs:** response, signed/abs error,
  RT, points; per-subject `w(t)`.
- **Analysis:** mixture-weight model `response ~ countRatio + w(t)·divergence`;
  static vs logistic vs change-point fit, AIC model selection; fraction of
  learners classified "insight" vs "gradual" vs "non-learner."
- **Predicts:** `w₀≈0` → rises; a substantial insight subgroup; learning carried by
  high-divergence trials. **Falsified if** `w` stays ≈0 (no learning) or responses
  track count throughout.

### Experiment 2 — Information about state changes (the single-tile flip) *(primary novel study)*
- **Question:** Does the *informativeness* of a shown state change set the rate of
  learning? (H4)
- **Design:** after a judgment, flip one tile and re-judge. Between/within
  manipulation of flip **diagnosticity** using `flips.js`:
  - **High-info:** articulation/bridge flips (Δcount = ±1/N but Δcorrect large).
  - **Low-info:** interior flips (Δcorrect ≈ 0).
  - **Learner-chosen:** participant picks the tile to flip (active condition).
- **IV:** flip diagnosticity (high/low) and agency (experimenter- vs learner-chosen).
- **DVs:** slope of `w(t)`, time-to-change-point, post-learning retention/transfer.
- **Analysis:** compare `w(t)` trajectories across conditions; mediation of learning
  rate by cumulative diagnosticity experienced.
- **Predicts:** high-info flips → faster insight & better retention; experimenter-
  optimal may beat learner-chosen if people under-select diagnostic flips (Coenen
  2015; Gershman 2018). **Caution:** if flips reveal "what a different state would
  score," expect confirmation-biased updating (Lefebvre 2017; Boorman 2011) — use
  factual flips by default.

### Experiment 3 — Curriculum / stimulus ordering
- **Question:** Does the *schedule* of divergence/diagnosticity change acquisition?
- **Design:** order trials easy→hard vs hard→easy vs blocked vs interleaved by
  divergence.
- **Rationale & predicts:** curriculum shapes whether structure is extracted
  (Dekker 2022; Flesch 2018) — predict diagnostic-dense or scaffolded orders speed
  learning and raise asymptotic `w`.

### Experiment 4 — Models & representations (modeling now, neuro later)
- **Now (in silico):** train an RNN / meta-RL agent (Wang 2018; Yang 2019;
  Botvinick 2020) on the grid → response task; track representational geometry over
  training — abstraction/orthogonalization of the rule axis vs count axis (Bernardi
  2020; Flesch 2022; Chung 2021), decodability of `correctRatio` (cf. Schuck 2016),
  and alignment of its learning trajectory to human `w(t)` (Sucholutsky 2023).
- **Later (neuro):** test whether neural decodability of the latent score rises with
  `w` and whether the rule/count axes orthogonalize — most in the high-divergence
  regime where they are decorrelated by design.
- **Predicts (H6):** behavioral change-point coincides with representational
  reorganization; geometry predicts individual `w`.

---

## 6. Sample size & power

Per-subject `w` is recoverable at **RMSE ≈ 0.08** with 30 divergence-tiled trials
(σ≈0.08), tightening to ≈0.05 at 60 (see `analysis/recovery.py`). Insight
change-points are detected ~99% of the time and localized within ±3 trials in
~92%. This implies between-condition contrasts in Experiment 2 (e.g. a shift in
learning slope or change-point timing) are detectable with **modest n per cell
(~25–40)**; finalize with effect-size-specific runs of `recovery.py` before
preregistration.

---

## 7. Measures & analysis plan (shared)

- **Primary:** `w(t)` mixture model + change-point (insight) detection; model
  comparison (static / logistic / change-point) by AIC — `analysis/fit.py`.
- **Model-light check:** running correlation of `response` with `count` vs
  `correct` (a robustness version of H1–H2).
- **Transfer index:** error/`w` on held-out divergence ranges, new grid sizes, and
  color-inverted grids (H5).
- **Rule-hypothesis model comparison:** fit candidate rules (count, largest region,
  largest-of-either-color, perimeter, #regions) to find what each learner converged
  on (addresses the open hypothesis-space risk).
- **Normative benchmark:** Bayesian rule-inference + value-of-information optimal
  flip selection, as a yardstick for human `w(t)` and flip choices.

---

## 8. Risks & mitigations

- **Unenumerated hypotheses** (people learn a rule we didn't list) → debrief +
  rule-model comparison.
- **Perceptual vs conceptual** (a big blob "pops") → divergence dissociates them;
  add RT / eye-tracking.
- **`w` unidentifiable at low divergence** → keep the set divergence-rich (default).
- **Insight localization** needs enough diagnostic trials per person → power via
  `recovery.py`.

---

## 9. Status & roadmap

| Component | Status |
|---|---|
| Task (grid judgment, timed, points) | **Built & live** (`https://jonathanamichaels.github.io/Cogitate/`) |
| Divergence-tiled & constructive stimuli | **Built** (`src/game/stimuli.js`) |
| Online data capture (DataPipe→OSF) | **Built** |
| Flip-informativeness engine | **Built** (`src/game/flips.js`) — Exp 2 selector |
| `w(t)` analysis + power validation | **Built** (`analysis/`) |
| Exp 1 (baseline) | **Ready to pilot** |
| Exp 2 (flip phase) | Plugin/timeline wiring pending |
| Exp 3 (curriculum) | Config-level change |
| Exp 4 (RNN/meta-RL + geometry) | Modeling build pending |
| Human neuroimaging arm | Future |

---

*Cited PDFs: `papers/` (gitignored, Dropbox-backed) — see `papers/README.md`.*
