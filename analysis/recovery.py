"""Parameter-recovery / power analysis: can we measure structure learning in
people *with this design*?

Simulates learners with KNOWN w-trajectories, fits them with analysis/fit.py, and
quantifies how well we recover (a) static reliance w, (b) gradual w(t), and
(c) insight change-points — as a function of trial count and response noise.

    python analysis/recovery.py        # prints a summary, saves analysis/figures/*.png
"""
from __future__ import annotations

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from common import load_stimuli, ensure_fig_dir  # noqa: E402
from agents import StaticMixtureAgent, DeltaRuleLearner, InsightLearner  # noqa: E402
from fit import fit_static, fit_logistic, fit_changepoint  # noqa: E402


# ----------------------------------------------------------------------------- static
def static_recovery(stim, sigma, reps, rng):
    true_w, hat_w = [], []
    for _ in range(reps):
        w = float(rng.uniform(0.0, 1.0))
        _, _, resp = StaticMixtureAgent(w=w).simulate(
            stim.correct, stim.count, sigma=sigma, lapse=0.02, seed=int(rng.integers(1e9))
        )
        f = fit_static(resp, stim.correct, stim.count)
        true_w.append(w)
        hat_w.append(f["w"])
    true_w, hat_w = np.array(true_w), np.array(hat_w)
    rmse = float(np.sqrt(np.nanmean((hat_w - true_w) ** 2)))
    bias = float(np.nanmean(hat_w - true_w))
    return true_w, hat_w, rmse, bias


# --------------------------------------------------------------------------- gradual
def gradual_recovery(stim, sigma, reps, rng):
    corrs, final_err = [], []
    examples = []
    for i in range(reps):
        lr = float(rng.uniform(0.5, 4.0))
        ag = DeltaRuleLearner(lr=lr)
        w_true, _, resp = ag.simulate(
            stim.correct, stim.count, sigma=sigma, lapse=0.02, seed=int(rng.integers(1e9))
        )
        f = fit_logistic(resp, stim.correct, stim.count)
        wt = f["w_traj"]
        if np.all(np.isfinite(wt)) and np.std(w_true) > 1e-6:
            corrs.append(float(np.corrcoef(w_true, wt)[0, 1]))
            final_err.append(abs(wt[-1] - w_true[-1]))
            if i < 1:
                examples.append((w_true, wt))
    return np.array(corrs), np.array(final_err), examples


# --------------------------------------------------------------------------- insight
def insight_recovery(stim, sigma, reps, rng):
    loc_err, detected, examples = [], [], []
    for i in range(reps):
        theta = float(rng.uniform(0.6, 1.8))
        wp = float(rng.uniform(0.85, 1.0))
        ag = InsightLearner(theta=theta, w_post=wp)
        cp_true = ag.true_changepoint(stim.correct, stim.count)
        if cp_true is None or cp_true < 2 or cp_true > stim.n - 2:
            continue  # switch outside the analyzable window
        w_true, _, resp = ag.simulate(
            stim.correct, stim.count, sigma=sigma, lapse=0.02, seed=int(rng.integers(1e9))
        )
        cp = fit_changepoint(resp, stim.correct, stim.count)
        st = fit_static(resp, stim.correct, stim.count)
        loc_err.append(abs(cp["tau"] - cp_true))
        detected.append(cp["aic"] < st["aic"])  # insight preferred over static
        if i < 1:
            examples.append((w_true, cp["w_traj"], cp_true, cp["tau"]))
    return np.array(loc_err, float), np.array(detected, bool), examples


# ------------------------------------------------------------------------------ main
def main():
    fig_dir = ensure_fig_dir()
    rng = np.random.default_rng(20260607)
    REPS = 250
    SIGMA = 0.08  # realistic response noise on the 0..1 slider

    sets = {"config (30 trials)": load_stimuli("config"),
            "long (60 trials)": load_stimuli("long")}

    print("=" * 68)
    print(" Cogitate parameter-recovery / power analysis")
    print(f"   {REPS} simulated subjects per cell · response noise sigma={SIGMA}")
    print("=" * 68)

    summary = {}
    for label, stim in sets.items():
        tw, hw, rmse, bias = static_recovery(stim, SIGMA, REPS, rng)
        corrs, ferr, grad_ex = gradual_recovery(stim, SIGMA, REPS, rng)
        loc, det, ins_ex = insight_recovery(stim, SIGMA, REPS, rng)
        summary[label] = dict(
            stim=stim, tw=tw, hw=hw, rmse=rmse, bias=bias,
            corrs=corrs, ferr=ferr, grad_ex=grad_ex,
            loc=loc, det=det, ins_ex=ins_ex,
        )
        print(f"\n--- {label} ---")
        print(f"  STATIC w     : RMSE={rmse:.3f}  bias={bias:+.3f}")
        print(f"  GRADUAL w(t) : median corr(true,fit)={np.median(corrs):.2f}  "
              f"final-w err={np.median(ferr):.3f}")
        within3 = float(np.mean(loc <= 3)) if len(loc) else float("nan")
        print(f"  INSIGHT      : detection rate={np.mean(det):.0%}  "
              f"median |Δchange-point|={np.median(loc):.1f} trials  "
              f"within±3={within3:.0%}")

    # ---- Figures (use the 30-trial 'config' set = the real design) ----
    S = summary["config (30 trials)"]
    n = S["stim"].n

    # Fig 1: example recovered trajectories
    fig, ax = plt.subplots(1, 2, figsize=(10, 3.6))
    if S["grad_ex"]:
        wt, wh = S["grad_ex"][0]
        ax[0].plot(wt, "k-", lw=2, label="true w(t)")
        ax[0].plot(wh, "C0--", lw=2, label="fitted (logistic)")
    ax[0].set(title="Gradual learner", xlabel="trial", ylabel="w (reliance on rule)", ylim=(-0.05, 1.05))
    ax[0].legend(fontsize=8)
    if S["ins_ex"]:
        wt, wh, cpt, cph = S["ins_ex"][0]
        ax[1].plot(wt, "k-", lw=2, label="true w(t)")
        ax[1].plot(wh, "C3--", lw=2, label="fitted (change-pt)")
        ax[1].axvline(cpt, color="k", ls=":", lw=1)
        ax[1].axvline(cph, color="C3", ls=":", lw=1)
    ax[1].set(title="Insight learner", xlabel="trial", ylim=(-0.05, 1.05))
    ax[1].legend(fontsize=8)
    fig.suptitle(f"Recovered w(t) — {n}-trial design, sigma={SIGMA}")
    fig.tight_layout()
    fig.savefig(f"{fig_dir}/recovery_examples.png", dpi=130)

    # Fig 2: static-w recovery scatter (config vs long)
    fig, ax = plt.subplots(1, 2, figsize=(8.5, 4))
    for a, (label, S2) in zip(ax, summary.items()):
        a.plot([0, 1], [0, 1], "k:", lw=1)
        a.scatter(S2["tw"], S2["hw"], s=10, alpha=0.4, color="C0")
        a.set(title=f"{label}\nRMSE={S2['rmse']:.3f}", xlabel="true w", ylabel="recovered w",
              xlim=(-0.1, 1.1), ylim=(-0.3, 1.3))
    fig.suptitle("Static-reliance recovery")
    fig.tight_layout()
    fig.savefig(f"{fig_dir}/recovery_static.png", dpi=130)

    # Fig 3: insight change-point localization error
    fig, ax = plt.subplots(figsize=(5.5, 3.6))
    for label, S2 in summary.items():
        if len(S2["loc"]):
            ax.hist(S2["loc"], bins=np.arange(0, n, 1), alpha=0.5,
                    label=f"{label} (det {np.mean(S2['det']):.0%})")
    ax.set(title="Insight change-point localization error",
           xlabel="|fitted − true change-point| (trials)", ylabel="count")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(f"{fig_dir}/recovery_insight.png", dpi=130)

    print(f"\nFigures written to {fig_dir}/")
    print("  recovery_examples.png  recovery_static.png  recovery_insight.png")


if __name__ == "__main__":
    main()
