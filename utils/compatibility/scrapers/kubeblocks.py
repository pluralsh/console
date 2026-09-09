"""Read release-specific Kubernetes requirements from KubeBlocks Helm metadata."""

import re

import yaml
from semantic_version import Version

APP_NAME = "kubeblocks"
HELM_INDEX_URL = "https://apecloud.github.io/helm-charts/index.yaml"


def _stable_version(value):
    if not isinstance(value, str):
        return None
    try:
        version = Version(value.removeprefix("v"))
    except ValueError:
        return None
    return version if not version.prerelease and not version.build else None


def build_rows(content, current_kube):
    """Expand declared Helm lower bounds, not a cluster-tested support matrix.

    Keep every application patch so the shared reducer can preserve requirement
    changes within a minor release. Unsupported constraints abort before writing.
    """
    current = re.fullmatch(r"1\.(\d+)", current_kube or "")
    if not current:
        raise ValueError("Invalid current Kubernetes minor version")
    try:
        data = yaml.safe_load(content)
    except (yaml.YAMLError, UnicodeError) as exc:
        raise ValueError("Invalid KubeBlocks Helm index") from exc
    entries = data.get("entries") if isinstance(data, dict) else None
    charts = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("KubeBlocks chart entries not found")

    latest = {}
    for chart in charts:
        if not isinstance(chart, dict) or chart.get("deprecated"):
            continue
        app_version = _stable_version(chart.get("appVersion"))
        chart_version = _stable_version(chart.get("version"))
        if app_version is None or chart_version is None:
            continue
        previous = latest.get(app_version)
        if previous is None or chart_version > previous[0]:
            latest[app_version] = (chart_version, chart)

    rows = []
    for app_version, (chart_version, chart) in sorted(latest.items(), reverse=True):
        constraint = chart.get("kubeVersion")
        # Current published stable charts use >=1.20.0-0 or >=1.22.0-0.
        # A patch-level floor or compound range cannot be approximated safely.
        minimum = (
            re.fullmatch(r">=\s*1\.(\d+)\.0(?:-0)?", constraint.strip())
            if isinstance(constraint, str) else None
        )
        if not minimum:
            raise ValueError(
                f"Unsupported Kubernetes constraint in KubeBlocks chart "
                f"{chart_version}: {constraint!r}"
            )
        low, high = int(minimum[1]), int(current[1])
        if low > high:
            raise ValueError(
                f"KubeBlocks chart {chart_version} requires a newer "
                f"Kubernetes version than {current_kube}"
            )
        rows.append({
            "version": str(app_version),
            "kube": [f"1.{minor}" for minor in range(high, low - 1, -1)],
            "chart_version": str(chart_version),
            "requirements": [],
            "incompatibilities": [],
        })
    if not rows:
        raise ValueError("No stable KubeBlocks charts found")
    return rows


def scrape():
    from utils import current_kube_version, fetch_page, update_compatibility_info

    content = fetch_page(HELM_INDEX_URL)
    if not content:
        raise ValueError("Could not fetch KubeBlocks Helm index")
    rows = build_rows(content, current_kube_version())
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
