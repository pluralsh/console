from __future__ import annotations

import yaml
from collections import OrderedDict

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


app_name = "dagster"
HELM_INDEX_URL = "https://dagster-io.github.io/helm/index.yaml"


def _kube_versions_from_constraint(kube_version: str) -> list[str]:
    if not kube_version:
        return []

    min_version = None
    max_version = None
    for part in kube_version.replace(" ", "").split(","):
        if part.startswith(">"):
            cleaned = part.lstrip("><=v").replace("-0", "")
            sem = validate_semver(cleaned)
            if sem:
                min_version = f"{sem.major}.{sem.minor}"
        elif part.startswith("<"):
            cleaned = part.lstrip("><=v").replace("-0", "")
            sem = validate_semver(cleaned)
            if sem:
                max_version = f"{sem.major}.{sem.minor}"

    if not min_version:
        return []

    if not max_version:
        max_version = current_kube_version()
    if not max_version:
        return []

    return expand_kube_versions(min_version, max_version)


def _fetch_index():
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return None
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Dagster helm index: {exc}")
        return None


def scrape() -> None:
    index = _fetch_index()
    if not index:
        return

    entries = index.get("entries", {}).get(app_name, [])
    if not entries:
        print_error("No Dagster chart entries found in helm index.")
        return

    versions = []
    for chart in entries:
        raw_chart_version = str(chart.get("version", "")).lstrip("v")
        raw_app_version = str(chart.get("appVersion", "")).lstrip("v")

        app_semver = validate_semver(raw_app_version)
        chart_semver = validate_semver(raw_chart_version)

        semver = app_semver or chart_semver
        if not semver:
            continue

        kube_versions = _kube_versions_from_constraint(
            chart.get("kubeVersion", "")
        )
        if not kube_versions:
            continue

        version_info = OrderedDict(
            [
                ("version", str(semver)),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        if chart_semver:
            version_info["chart_version"] = str(chart_semver)
        versions.append(version_info)

    if not versions:
        print_error("No Dagster compatibility rows parsed.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )
