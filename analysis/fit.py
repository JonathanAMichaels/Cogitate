"""Fit the structure-learning weight w(t) from behavioral data.

Model (docs/SYNTHESIS.md §1):  response_t = countRatio_t + w_t * (correctRatio_t - countRatio_t) + noise
So with  x_t = correctRatio_t - countRatio_t (= divergence)  and  y_t = response_t - countRatio_t,
w_t is the slope of y on x. Three nested forms of w_t:

  * static     w_t = w                                  (1 free param)
  * logistic   w_t = L0 + (L1-L0)/(1+exp(-(t-t0)/tau))  (4 free params; gradual learning)
  * changepoint w_t = w_pre if t<tau else w_post        (3 free params; insight)

`x` only varies the answer when divergence != 0, so w is ONLY identifiable on
high-|divergence| trials — the measurement reason the stimulus set is divergence-tiled.
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import least_squares
from scipy.special import expit


def _slope_through_origin(x, y):
    """OLS slope of y = w*x (no intercept). Returns nan if x has ~no spread."""
    sxx = float(np.sum(x * x))
    if sxx < 1e-9:
        return np.nan
    return float(np.sum(x * y) / sxx)


def _sse(resp, correct, count, w):
    pred = count + w * (correct - count)
    r = resp - pred
    return float(np.sum(r * r))


def _aic(sse, n, k):
    sse = max(sse, 1e-12)
    return n * np.log(sse / n) + 2 * k


def fit_static(resp, correct, count):
    x = correct - count
    y = resp - count
    w = _slope_through_origin(x, y)
    sse = _sse(resp, correct, count, w)
    return {"w": w, "sse": sse, "k": 1, "aic": _aic(sse, len(resp), 1)}


def fit_logistic(resp, correct, count):
    n = len(resp)
    t = np.arange(n, dtype=float)
    x = correct - count

    def w_of_t(p):
        L0, L1, t0, tau = p
        return L0 + (L1 - L0) * expit((t - t0) / tau)

    def resid(p):
        return resp - (count + w_of_t(p) * x)

    p0 = [0.0, 1.0, n / 2.0, max(n / 6.0, 1.0)]
    lb = [-0.5, -0.5, -n, 0.5]
    ub = [1.5, 1.5, 2 * n, float(n)]
    try:
        res = least_squares(resid, p0, bounds=(lb, ub), max_nfev=2000)
        L0, L1, t0, tau = res.x
        w_traj = w_of_t(res.x)
        sse = float(np.sum(res.fun**2))
        return {
            "L0": L0, "L1": L1, "t0": t0, "tau": tau,
            "w_traj": w_traj, "sse": sse, "k": 4, "aic": _aic(sse, n, 4),
        }
    except Exception:
        return {"L0": np.nan, "L1": np.nan, "t0": np.nan, "tau": np.nan,
                "w_traj": np.full(n, np.nan), "sse": np.inf, "k": 4, "aic": np.inf}


def fit_changepoint(resp, correct, count, min_seg=3):
    """Two-segment fit; scans every change-point tau and keeps the best SSE."""
    n = len(resp)
    x = correct - count
    y = resp - count
    best = None
    for tau in range(min_seg, n - min_seg + 1):
        pre, post = slice(0, tau), slice(tau, n)
        w_pre = _slope_through_origin(x[pre], y[pre])
        w_post = _slope_through_origin(x[post], y[post])
        if np.isnan(w_pre) or np.isnan(w_post):
            continue
        w_traj = np.where(np.arange(n) < tau, w_pre, w_post).astype(float)
        sse = _sse(resp, correct, count, w_traj)
        if best is None or sse < best["sse"]:
            best = {"tau": tau, "w_pre": w_pre, "w_post": w_post,
                    "w_traj": w_traj, "sse": sse, "k": 3, "aic": _aic(sse, n, 3)}
    if best is None:  # degenerate (too few diagnostic trials)
        s = fit_static(resp, correct, count)
        return {"tau": np.nan, "w_pre": s["w"], "w_post": s["w"],
                "w_traj": np.full(n, s["w"]), "sse": s["sse"], "k": 3,
                "aic": _aic(s["sse"], n, 3)}
    return best


def fit_subject(resp, correct, count):
    """Fit all three models and pick the best by AIC."""
    resp = np.asarray(resp, float)
    correct = np.asarray(correct, float)
    count = np.asarray(count, float)
    out = {
        "static": fit_static(resp, correct, count),
        "logistic": fit_logistic(resp, correct, count),
        "changepoint": fit_changepoint(resp, correct, count),
    }
    out["best"] = min(out, key=lambda m: out[m]["aic"])
    return out


if __name__ == "__main__":
    # Demo: simulate one insight learner and show the recovered fit.
    from common import load_stimuli
    from agents import InsightLearner

    st = load_stimuli("config")
    agent = InsightLearner(theta=1.0)
    w_true, _, resp = agent.simulate(st.correct, st.count, sigma=0.08, seed=1)
    fits = fit_subject(resp, st.correct, st.count)
    cp = fits["changepoint"]
    print(f"true change-point  : {agent.true_changepoint(st.correct, st.count)}")
    print(f"fitted change-point: {cp['tau']}  (w_pre={cp['w_pre']:.2f} -> w_post={cp['w_post']:.2f})")
    print(f"AIC  static={fits['static']['aic']:.1f}  "
          f"logistic={fits['logistic']['aic']:.1f}  changepoint={cp['aic']:.1f}")
    print(f"best model: {fits['best']}")
