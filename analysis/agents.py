"""Simulated learner agents for the Cogitate task.

Every agent implements the generative model from docs/SYNTHESIS.md §1:

    prediction p_t = w_t * correctRatio_t + (1 - w_t) * countRatio_t
    response_t     = clip(p_t + Normal(0, sigma), 0, 1)   (+ occasional lapse)

`w_t` in [0, 1] is the learner's reliance on the true (largest-region) rule vs.
the counting heuristic. Different agents differ only in how `w_t` evolves:

  * CountAgent          w_t = 0                (never learns the rule)
  * RuleAgent           w_t = 1                (already knows the rule)
  * StaticMixtureAgent  w_t = w                (fixed partial reliance)
  * DeltaRuleLearner    w_t rises gradually, faster after high-divergence trials
  * InsightLearner      w_t jumps at a data-dependent change-point ("aha")

Learning is driven by the TRUE feedback (correctRatio), not the agent's own noisy
response — i.e. participants learn from the displayed correct answer.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def _clip01(x):
    return float(np.clip(x, 0.0, 1.0))


class Agent:
    name = "agent"

    def w_sequence(self, correct: np.ndarray, count: np.ndarray) -> np.ndarray:
        """Return w_t used to PREDICT each trial (depends only on earlier feedback)."""
        raise NotImplementedError

    def simulate(self, correct, count, sigma=0.08, lapse=0.02, seed=0):
        """Generate responses. Returns (w_true, prediction, response)."""
        rng = np.random.default_rng(seed)
        w = self.w_sequence(correct, count)
        p = w * correct + (1.0 - w) * count
        resp = p + rng.normal(0.0, sigma, size=p.shape)
        lap = rng.random(p.shape[0]) < lapse
        resp[lap] = rng.random(int(lap.sum()))
        resp = np.clip(resp, 0.0, 1.0)
        return w, p, resp


@dataclass
class CountAgent(Agent):
    name = "count"

    def w_sequence(self, correct, count):
        return np.zeros_like(correct)


@dataclass
class RuleAgent(Agent):
    name = "rule"

    def w_sequence(self, correct, count):
        return np.ones_like(correct)


@dataclass
class StaticMixtureAgent(Agent):
    w: float = 0.5
    name = "static"

    def w_sequence(self, correct, count):
        return np.full_like(correct, _clip01(self.w))


@dataclass
class DeltaRuleLearner(Agent):
    """Gradient learner. Update: w += lr * (1-w) * divergence**2  (>= 0).

    High-divergence trials carry bigger updates, so the rate of learning is
    paced by the diagnosticity of the trials the learner happens to see.
    """

    w0: float = 0.0
    lr: float = 2.0
    name = "delta"

    def w_sequence(self, correct, count):
        n = len(correct)
        seq = np.empty(n)
        w = _clip01(self.w0)
        for t in range(n):
            seq[t] = w  # w used to predict trial t
            div = correct[t] - count[t]
            err = correct[t] - (w * correct[t] + (1 - w) * count[t])  # = (1-w)*div
            w = _clip01(w + self.lr * err * div)  # = w + lr*(1-w)*div^2
        return seq


@dataclass
class InsightLearner(Agent):
    """Accumulates diagnostic evidence; w jumps w_pre -> w_post once it crosses theta.

    Models a discrete "aha" moment whose timing depends on how much diagnostic
    (high-|divergence|) evidence has accumulated.
    """

    w_pre: float = 0.0
    w_post: float = 0.95
    theta: float = 1.2  # evidence threshold (sum of |divergence|)
    name = "insight"

    def w_sequence(self, correct, count):
        n = len(correct)
        seq = np.empty(n)
        w = _clip01(self.w_pre)
        evidence = 0.0
        switched = False
        for t in range(n):
            seq[t] = w
            evidence += abs(correct[t] - count[t])
            if (not switched) and evidence >= self.theta:
                w = _clip01(self.w_post)
                switched = True
        return seq

    def true_changepoint(self, correct, count):
        """Index of the first trial PREDICTED with w_post (or None if never)."""
        seq = self.w_sequence(correct, count)
        post = np.where(seq >= self.w_post - 1e-9)[0]
        return int(post[0]) if len(post) else None
