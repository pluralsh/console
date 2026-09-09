"""Read Artifact Hub's Helm installation constraints, not its tested CI matrix."""

from __future__ import annotations

import re
from collections import OrderedDict
from typing import Any

import requests
import yaml
from semantic_version import Version

from utils import current_kube_version, update_compatibility_info

APP_NAME = "artifact-hub"
INDEX_URL = "https://artifacthub.github.io/helm-charts/index.yaml"
FIRST_CONSTRAINED_CHART = Version("0.17.0")
MINOR = r"(?:0|[1-9][0-9]*)"
FLOOR = re.compile(rf">=\s*1\.({MINOR})\.0(?:-0)?")


def _version(value: Any) -> Version:
    if not isinstance(value, str):
        raise ValueError("Artifact Hub versions must be strings")
    return Version(value.removeprefix("v"))


def _select_charts(entries: list) -> dict[Version, dict]:
    """Select the latest stable chart for each app without relying on index order."""
    selected = {}
    seen = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Artifact Hub chart entry")
        chart = _version(entry.get("version"))
        app = _version(entry.get("appVersion"))
        if chart.prerelease or app.prerelease or chart.build or app.build:
            continue
        # Earlier published charts omit kubeVersion. Do not infer their support.
        if chart < FIRST_CONSTRAINED_CHART:
            continue
        candidate = {
            "version": str(app),
            "chart_version": str(chart),
            "constraint": entry.get("kubeVersion"),
        }
        if chart in seen and seen[chart] != candidate:
            raise ValueError(f"Conflicting Artifact Hub chart {chart}")
        seen[chart] = candidate
        previous = selected.get(app)
        if previous is None or chart > Version(previous["chart_version"]):
            selected[app] = candidate
    return selected


def _kube_minors(constraint: Any, maximum: int) -> list[str]:
    # Only expand the source's observed whole-minor lower-bound grammar.
    # Patch floors, upper bounds and disjunctions need explicit handling first.
    match = FLOOR.fullmatch(constraint.strip()) if isinstance(constraint, str) else None
    if match is None:
        raise ValueError(f"Unsupported Artifact Hub kubeVersion constraint: {constraint!r}")
    minimum = int(match[1])
    if minimum > maximum:
        raise ValueError("Artifact Hub Kubernetes minimum exceeds KUBE_VERSION")
    return [f"1.{minor}" for minor in range(maximum, minimum - 1, -1)]


def build_rows(content: str | bytes, kube_version: str) -> list[OrderedDict]:
    """Validate all candidates before returning rows for the existing update helper."""
    cap = re.fullmatch(rf"1\.({MINOR})", kube_version) if isinstance(kube_version, str) else None
    if cap is None:
        raise ValueError("KUBE_VERSION must be a Kubernetes 1.x minor")
    document = yaml.safe_load(content)
    entries = document.get("entries") if isinstance(document, dict) else None
    charts = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("Artifact Hub chart index is missing or empty")
    selected = _select_charts(charts)
    rows = []
    for version in sorted(selected, reverse=True):
        candidate = selected[version]
        rows.append(OrderedDict([
            ("version", str(version)),
            ("kube", _kube_minors(candidate["constraint"], int(cap[1]))),
            ("chart_version", candidate["chart_version"]),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    if not rows:
        raise ValueError("No stable Artifact Hub charts with documented constraints")
    return rows


def scrape() -> None:
    response = requests.get(INDEX_URL, timeout=30)
    response.raise_for_status()
    rows = build_rows(response.text, current_kube_version())
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)

