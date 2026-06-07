"""Shared helpers: load the exported stimulus set and its ground-truth metrics."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
FIG_DIR = os.path.join(HERE, "figures")


@dataclass
class Stimuli:
    """A stimulus set: per-trial true (correctRatio) and count (countRatio) answers."""

    name: str
    correct: np.ndarray  # correctRatio per trial (the hidden-rule answer)
    count: np.ndarray  # countRatio per trial (the naive counting answer)
    divergence: np.ndarray  # correct - count
    n: int

    @property
    def order_seed(self) -> int:
        return abs(hash(self.name)) % (2**31)


def load_stimuli(name: str = "config") -> Stimuli:
    path = os.path.join(DATA_DIR, f"stimuli-{name}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"{path} not found. Generate it first:\n"
            f"  node scripts/export-stimuli.js 30 {name}"
        )
    with open(path) as f:
        blob = json.load(f)
    trials = blob["trials"]
    correct = np.array([t["correctRatio"] for t in trials], dtype=float)
    count = np.array([t["countRatio"] for t in trials], dtype=float)
    div = np.array([t["divergence"] for t in trials], dtype=float)
    return Stimuli(name=name, correct=correct, count=count, divergence=div, n=len(trials))


def ensure_fig_dir() -> str:
    os.makedirs(FIG_DIR, exist_ok=True)
    return FIG_DIR
