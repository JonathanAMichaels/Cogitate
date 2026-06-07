# Cogitate — simulation & analysis

Simulate learner **agents** performing the Cogitate task, then fit the
structure-learning weight **w(t)** (reliance on the true largest-region rule vs.
the counting heuristic) — to validate that our analysis can recover what we care
about *before* running people. Implements docs/SYNTHESIS.md §1 & §6.

## Pipeline

```
scripts/export-stimuli.js   (Node)   ->  analysis/data/stimuli-*.json   # trials + ground truth
analysis/agents.py                   ->  learner models (count / rule / static / delta / insight)
analysis/simulate.py                 ->  analysis/data/simulated.csv     # population, schema = real data
analysis/fit.py                      ->  fit w(t): static | logistic | change-point (+ AIC model pick)
analysis/recovery.py                 ->  parameter recovery / power analysis + analysis/figures/*.png
```

## Setup & run

```bash
# from the repo root
node scripts/export-stimuli.js 30 config     # (re)generate the stimulus set
node scripts/export-stimuli.js 60 long

python3 -m venv analysis/venv
source analysis/venv/bin/activate
pip install -r analysis/requirements.txt

python analysis/simulate.py                  # -> data/simulated.csv
python analysis/fit.py                        # demo: recover one insight learner
python analysis/recovery.py                   # power analysis + figures
```

## The model

```
response_t = countRatio_t + w_t * (correctRatio_t - countRatio_t) + noise
```

`w_t ∈ [0,1]` is reliance on the hidden rule. Because `(correctRatio − countRatio)`
= **divergence**, `w` is only identifiable on high-|divergence| trials — the
measurement reason the stimulus set is divergence-tiled. Three forms of `w_t`:
**static** (constant), **logistic** (gradual learning), **change-point**
(insight); the best is chosen by AIC.

## Agents (`agents.py`)

| agent | w(t) | models |
|---|---|---|
| `CountAgent` | 0 | never learns the rule (pure counter) |
| `RuleAgent` | 1 | already knows the rule |
| `StaticMixtureAgent` | constant | fixed partial reliance |
| `DeltaRuleLearner` | rises, ∝ divergence² | gradual learning |
| `InsightLearner` | step at evidence threshold | discrete "aha" |

## What `recovery.py` answers

For the real design (30 divergence-tiled trials, slider noise σ≈0.08) it reports,
over hundreds of simulated subjects: static-w **RMSE**, gradual **w(t)
correlation**, and insight **change-point detection rate & localization error** —
and compares 30- vs 60-trial designs so you can size the study. Figures land in
`analysis/figures/`.

Generated artifacts (`venv/`, `figures/`, `data/*.csv`) are gitignored; the
`stimuli-*.json` are kept so the pipeline runs without Node.
