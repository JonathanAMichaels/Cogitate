# Cogitate — a synthesis: learning the structure of a hidden value function

*A framework connecting the three literature strands (`papers/`) into testable
predictions for the Cogitate paradigm.*

---

## 0. Thesis in one paragraph

Cogitate turns an old, hard question — *how do people learn to evaluate novel
situations?* — into a controllable microworld. A participant must estimate a
grid's hidden "score." The score is a **topological** property (the size of the
largest contiguous same-color region), but the most available heuristic is a
**counting** one (the proportion of black squares). Learning the task therefore
*is* a structure-inference problem: discovering which generative rule produces
the feedback, and shifting one's internal value function from the count
heuristic toward the true contiguity rule. The single quantity that makes this
tractable is **divergence** = `correctRatio − countRatio`. It is simultaneously
(i) the experimental difficulty axis, (ii) the definition of how *diagnostic* a
trial or a state-change is, and (iii) the dimension that should separate "count"
from "structure" in neural/representational space. The three research strands map
cleanly onto this: **(1)** the learner infers task structure; **(2)** information
about **state changes** (the single-tile flip) accelerates and shapes that
inference; **(3)** the **representational geometry** of brains and networks tracks
the progress from count-axis to structure-axis.

---

## 1. The learner's problem is structure inference (Strand 1)

Frame the participant as a Bayesian-ish learner maintaining a distribution over
candidate scoring rules — at minimum {count proportion, largest-region ratio},
plausibly a richer space (total area, number of regions, perimeter, largest
region of *either* color, …). This is exactly the "infer the generative form of
the task" problem formalized by **Tenenbaum et al. 2011** and **Gershman, Norman
& Niv 2015** (latent-cause inference), and named as the central challenge by
**Niv 2019** ("learning *what to represent*") and **Tervo, Tenenbaum & Gershman
2016** (structure learning). The learner is not just adjusting a value estimate;
they are selecting a *hypothesis about state space* (cf. **Schuck et al. 2016**,
**Wilson & Niv 2012** on discovering the relevant dimension).

**The count heuristic is the prior.** Counting (or coarse area/density) is the
natural default — it is what numerosity/ensemble perception delivers for free.
So early behavior should track `countRatio`; learning is the reallocation of
weight toward `correctRatio`.

**Core measurement model.** On each trial model the response as a mixture:

```
response ≈ w · correctRatio + (1 − w) · countRatio + bias + noise
```

`w` ∈ [0,1] is the learner's reliance on the true rule. This is directly
fittable from our logged data (`response`, `correct_ratio`, `count_ratio`), and
`w(t)` is the **learning curve of structure acquisition**. Crucially, `w` is
*only identifiable when divergence is non-zero* — on near-zero-divergence grids
the two rules predict the same answer. **This is the measurement-theoretic reason
the stimulus set is tiled across divergence** (and why the constructive generator
that reaches ±0.4 matters): high-|divergence| trials are the diagnostic ones.

**Shape of the curve.** Will `w(t)` rise gradually or jump? The deep-linear-net
theory of **Saxe et al. 2014/2019** predicts *stage-like* learning (plateaus then
abrupt drops) whenever a task has separable structure; **Lee/Löwe et al. 2024**
show "aha"-like sudden strategy switches emerging from gradual gradient learning
in simple regularised nets. **Prediction:** many participants will show a
*change-point* in `w` — a discrete insight — rather than smooth drift. (Analyze
with change-point/HMM models, not just group-averaged curves, which blur
individual insight moments.)

**Generalization is the test of true structure learning** (**Mark et al. 2020**,
**Collins & Frank 2013**, **Lake & Baroni 2018/2023**). If a learner has the rule
(not a lookup table), they should transfer to: new grid sizes, held-out
divergence ranges, and **color inversion** (where `correctRatio → 1 − correctRatio`
and `divergence → −divergence`). Transfer to inversion is an especially clean
probe: a counter will fail systematically, a rule-learner will not.

---

## 2. State-change information is an intervention (Strand 2)

The planned **single-tile flip** is, in causal-learning terms, a localized
**intervention** whose effect on the score the learner observes — the cleanest
possible probe of "what drives the value." This is the regime where intervention
beats observation (**Lagnado & Sloman 2004**, **Bramley et al. 2017** *Neurath's
Ship*, **Coenen, Rehder & Gureckis 2015**): a single change with a visible
consequence isolates the causal variable far better than passively viewing whole
grids.

**Defining a flip's informativeness — and making it computable.** A flip changes
the **count** by exactly ±1 every time, but changes the **true score** by an
amount that depends entirely on *which* tile is flipped. The maximally
informative flips are exactly those that **dissociate count from structure**:

- **Articulation points (cut vertices)** of the largest region: flipping a single
  black cell that bridges the largest black component can *sever* it, collapsing
  `blackScore` dramatically while changing the count by 1.
- **Bridge tiles**: flipping a white cell wedged between two large black
  components can *merge* them, jumping `blackScore` up.

These are O(cells) to compute (we already compute components; add an articulation-
point pass), so for any grid we can rank every possible single flip by how much
it moves `correctRatio`. Define flip informativeness operationally as either
**|Δ correctRatio|** or, better, the **value of information** — how much the flip
discriminates the count hypothesis (Δ ≈ constant tiny) from the contiguity
hypothesis (Δ large) — the formal "which query maximizes information gain" of
**Nelson et al. 2010**, **Coenen et al. 2015**, **Meder et al. 2020**. A
high-informativeness flip is a near-proof that the rule isn't counting: "I
changed one square and the score barely moved / leapt."

**Primary experimental manipulation.** Vary flip informativeness (high =
articulation/bridge tiles; low = interior tiles that change nothing) and measure
the effect on `w(t)`'s slope and change-point latency. **Prediction:** a few
high-informativeness flips trigger insight far faster than many uninformative
trials — the active-sampling acceleration of **Markant & Gureckis 2010** and
**Gureckis & Markant 2012**, and with better *retention* (**Markant et al. 2016**).

**Who chooses the flip?** Contrast (a) experimenter-chosen optimal flips, (b)
random flips, (c) **learner-chosen** flips (they pick a tile to toggle). Per
**Gershman 2018** and the self-directed-learning literature, learner control can
help — but people often under-select the most diagnostic option, so (a) may beat
(c). The gap between (a) and (c) is itself a measure of metacognitive insight
into the task structure.

**A design caution.** If feedback ever shows "what a *different* state would have
scored" (counterfactual), expect asymmetric, confirmation-biased updating
(**Lefebvre et al. 2017**) with a frontopolar counterfactual-prediction-error
signature (**Boorman et al. 2011**). Factual flip-outcomes avoid this; decide
deliberately. Feedback timing/granularity also modulates rate and which memory
system is engaged (**feedback-timing 2024**).

---

## 3. Neural & network states track the count→structure shift (Strand 3)

Two modeling targets, with shared analyses: an **artificial learner** (RNN /
meta-RL agent trained on the identical task) now, and **neural data** later. The
unifying prediction is geometric.

**The emergence of an abstract "structure axis."** Early in learning, the
representation should be dominated by the count/area signal. As `w` rises, the
**largest-region ratio should become an explicit, low-dimensional, abstract axis**
that generalizes across grids — increasingly **orthogonal** to the count axis.
This is the **geometry-of-abstraction** signature of **Bernardi et al. 2020**
(use their abstraction/cross-condition-generalization scores) and the
**rich-vs-lazy / orthogonalization** account of **Flesch et al. 2022** and
**Chung & Abbott 2021**. **Prediction:** abstraction score for `correctRatio`
rises with learning and *predicts* behavioral `w`; the count and structure axes
start collinear (both ≈ density) and separate over training — and they separate
*most* in the high-divergence regime, exactly where they are decorrelated by
design.

**The score is an unobservable latent the system must build.** `correctRatio`
isn't on the screen; it must be computed/represented. **Schuck et al. 2016**
(decoding unobservable task states from OFC, decodability ∝ performance) is the
template: predict that decodability of `correctRatio` from neural/RNN state rises
with learning and tracks trial-by-trial accuracy. The cognitive-map models
(**TEM, Whittington et al. 2020**; **Stachenfeld et al. 2017**; **Behrens et al.
2018**; **Samborska et al. 2022** for HPC/PFC division of labor) give mechanistic
candidates for how a relational/structural code could be factored from sensory
content and reused — directly relevant to transfer (§1).

**Learning dynamics should align across levels.** The behavioral change-point
(§1) should coincide with a representational reorganization in the network
(**Saxe**, **Lee 2024**), and **meta-RL** (**Wang et al. 2018**; **Botvinick et
al. 2020**) supplies a concrete mechanism for *fast within-session* rule
acquisition riding on slow synaptic learning — a model of how a participant
"gets it" in tens of trials. Curriculum matters: blocked vs interleaved exposure
changes whether structure is extracted (**Dekker et al. 2022**, and the
minds-vs-machines continual-learning result of Flesch et al.), so the **order**
of divergence/informativeness across trials is itself an IV.

**One metric to bind brains, humans, and nets:** representational alignment
(**Sucholutsky et al. 2023**) — compare the *trajectories* of human-behavioral,
neural, and network representations over learning, asking whether they traverse
the same count→structure path.

---

## 4. The integrated picture

```
            DIVERGENCE  (correctRatio − countRatio)
   the lever that makes trials diagnostic, defines flip informativeness,
            and decorrelates the count vs structure axes
                              │
   ┌──────────────────────────┼──────────────────────────┐
   ▼                          ▼                           ▼
STRAND 1                  STRAND 2                    STRAND 3
infer the rule       informative state-change       neural geometry
 w: count→struct  ⇐  (articulation-point flips)  ⇒  count-axis → struct-axis
 insight change-pt     accelerate & sharpen w        orthogonalize at insight
        └───────────────  same learning event, three measurement levels  ┘
```

A learner holds a weighting over scoring rules. Feedback — and especially
*informative interventions* — drive belief updating. Behaviorally this is the
rise of `w` (often an abrupt insight); representationally it is the emergence of
an abstract contiguity-score axis orthogonal to the count axis. Divergence is the
common currency linking the manipulation, the measurement, and the geometry.

---

## 5. Concrete, testable predictions

1. **Count-first.** Trial-1 responses correlate with `countRatio`, not
   `correctRatio`; `w₀ ≈ 0`.
2. **Diagnostic trials drive learning.** Reduction in error is carried by
   high-|divergence| trials; near-zero-divergence trials are nearly
   uninformative (and barely move `w`).
3. **Insight, not drift.** A substantial fraction of participants show a
   change-point in `w(t)` rather than smooth growth.
4. **Informative flips accelerate insight.** High-informativeness (articulation/
   bridge) flips shorten time-to-change-point and improve retention vs random or
   interior flips.
5. **Transfer asymmetry.** After learning, participants generalize to new sizes
   and to color inversion (`divergence → −divergence`); pure counters fail
   inversion systematically.
6. **Geometry tracks behavior.** In a trained network (and later neurally), the
   abstraction/decodability of `correctRatio` rises with `w` and orthogonalizes
   from `countRatio`, most strongly in the high-divergence regime.
7. **Curriculum effect.** Ordering trials by increasing diagnosticity (or
   blocking high-divergence early) changes acquisition speed.

---

## 6. What to build / fit (most are doable on current logs)

- **Mixture-weight model** `response ~ w·correct + (1−w)·count` with `w(t)` as a
  latent trajectory (state-space / HMM with a change-point). Primary DV.
- **Flip-informativeness engine.** Add an articulation-point/bridge pass to score
  every possible single flip by |Δ correctRatio| and by hypothesis-discriminating
  value of information; use it to *select* flips for the manipulation.
- **Psychometric drift:** track correlation of `response` with `count` vs
  `correct` over trials (a model-light version of #1–2).
- **RNN / meta-RL learner** on the identical stimulus stream; RSA over training
  for abstraction/orthogonalization (Bernardi/Flesch/Chung metrics);
  representational-alignment (Sucholutsky) of net vs human-behavioral trajectory.
- **Bayesian rule-inference model** over a hypothesis space of scoring rules as a
  normative benchmark for human `w(t)` and for choosing optimal flips
  (info-gain).

---

## 7. Open questions & risks

- **Hypothesis space.** People may entertain rules we haven't enumerated (e.g.
  "largest region of either color," perimeter, symmetry). Pilot debrief
  ("did you notice a rule?") + model comparison across candidate rules.
- **Perceptual confound.** Largest-region size is partly perceptually salient
  (a big blob "pops"); is learning conceptual or perceptual re-weighting? The
  divergence manipulation helps separate these; consider RT and eye-tracking.
- **Identifiability of `w`** collapses at low divergence — keep the set
  divergence-rich (already the default).
- **Insight detection** needs enough trials per person and sufficient diagnostic
  density to localize a change-point.

---

*Cited PDFs live in the local (gitignored, Dropbox-backed) `papers/` library —
folders `01-…`, `02-…`, `03-…`, with `papers/README.md` as the annotated
bibliography. The simulation + analysis pipeline that operationalizes §6 lives in
[`../analysis/`](../analysis/); the flip-informativeness engine (§2) is
[`../src/game/flips.js`](../src/game/flips.js).*
