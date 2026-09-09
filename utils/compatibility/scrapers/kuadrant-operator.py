"""Chart-declared Kuadrant operator Kubernetes floors, bounded by Plural's catalog."""
import re

import yaml

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "kuadrant-operator"
INDEX_URL = "https://kuadrant.io/helm-charts/index.yaml"


def stable_version(value):
    # Exact app/chart identities only: do not coerce partial versions into releases.
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        return None
    return validate_semver(value.removeprefix("v"))


def kubernetes_versions(spec, latest):
    # This is the grammar published in this chart's history, not a general Helm
    # constraint parser. Reject unknown ranges instead of silently widening them.
    match = re.fullmatch(r">=\s*v?(1)\.(\d+)\.0(?:-0)?", spec or "")
    current = re.fullmatch(r"1\.(\d+)", latest or "")
    if not match or not current:
        raise ValueError(f"Unsupported Kubernetes constraint/catalog version: {spec!r}, {latest!r}")
    floor, ceiling = int(match[2]), int(current[1])
    if floor > ceiling:
        raise ValueError("Chart minimum is newer than the catalog Kubernetes version")
    if floor == ceiling:
        return [latest]
    return list(reversed(expand_kube_versions(f"1.{floor}", latest)))


def extract_versions(index, latest):
    versions = {}
    for entry in index.get("entries", {}).get(APP_NAME, []):
        app = stable_version(entry.get("appVersion"))
        chart = stable_version(entry.get("version"))
        if app is None or chart is None:
            continue
        # Missing constraints are not compatibility evidence.
        if not entry.get("kubeVersion"):
            continue
        kube = kubernetes_versions(entry["kubeVersion"], latest)
        previous = versions.get(str(app))
        if previous and stable_version(previous["chart_version"]) >= chart:
            continue
        versions[str(app)] = {
            "version": str(app),
            "kube": kube,
            "chart_version": str(chart),
            "requirements": [],
            "incompatibilities": [],
        }
    return sorted(versions.values(), key=lambda row: stable_version(row["version"]), reverse=True)


def scrape():
    latest = current_kube_version()
    if not latest:
        raise ValueError("Cannot generate Kuadrant compatibility without KUBE_VERSION")
    content = fetch_page(INDEX_URL)
    if not content:
        raise ValueError("Could not fetch the official Kuadrant chart index")
    rows = extract_versions(yaml.safe_load(content), latest)
    if not rows:
        raise ValueError("No stable chart-backed Kuadrant application versions found")
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
