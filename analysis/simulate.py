"""Simulate a population of learner agents over the real stimulus set.

Writes a trial-level CSV whose columns mirror the experiment's data (plus the
agent's ground-truth w_t), so the same analysis code runs on simulated and real
data.

    python analysis/simulate.py            # -> analysis/data/simulated.csv
    python analysis/simulate.py long 50    # use stimuli-long.json, 50 subj/type
"""
from __future__ import annotations

import os
import sys

import numpy as np
import pandas as pd

from common import DATA_DIR, load_stimuli
from agents import (
    CountAgent,
    RuleAgent,
    StaticMixtureAgent,
    DeltaRuleLearner,
    InsightLearner,
)


def simulate_population(stim, n_per_type=30, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    sid = 0

    def add(agent, kind, extra):
        nonlocal sid
        sigma = float(rng.uniform(0.05, 0.12))
        lapse = float(rng.uniform(0.0, 0.05))
        w_true, _, resp = agent.simulate(
            stim.correct, stim.count, sigma=sigma, lapse=lapse, seed=int(rng.integers(1e9))
        )
        for t in range(stim.n):
            rows.append(
                {
                    "subject_id": f"sim{sid:04d}",
                    "agent": kind,
                    "trial_index": t,
                    "correct_ratio": stim.correct[t],
                    "count_ratio": stim.count[t],
                    "divergence": stim.divergence[t],
                    "w_true": w_true[t],
                    "response": resp[t],
                    "abs_error": abs(resp[t] - stim.correct[t]),
                    "sigma": sigma,
                    "lapse": lapse,
                    **extra,
                }
            )
        sid += 1

    for _ in range(n_per_type):
        add(CountAgent(), "count", {})
        add(RuleAgent(), "rule", {})
        w = float(rng.uniform(0.2, 0.8))
        add(StaticMixtureAgent(w=w), "static", {"true_w": w})
        lr = float(rng.uniform(0.5, 4.0))
        add(DeltaRuleLearner(lr=lr), "delta", {"true_lr": lr})
        theta = float(rng.uniform(0.6, 1.8))
        wp = float(rng.uniform(0.85, 1.0))
        ag = InsightLearner(theta=theta, w_post=wp)
        cp = ag.true_changepoint(stim.correct, stim.count)
        add(ag, "insight", {"true_theta": theta, "true_changepoint": cp})

    return pd.DataFrame(rows)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "config"
    n_per = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    stim = load_stimuli(name)
    df = simulate_population(stim, n_per_type=n_per, seed=7)
    os.makedirs(DATA_DIR, exist_ok=True)
    out = os.path.join(DATA_DIR, "simulated.csv")
    df.to_csv(out, index=False)
    n_subj = df["subject_id"].nunique()
    print(f"Simulated {n_subj} subjects x {stim.n} trials -> {out}")
    print(df.groupby("agent")["abs_error"].mean().round(3).to_string())


if __name__ == "__main__":
    main()
