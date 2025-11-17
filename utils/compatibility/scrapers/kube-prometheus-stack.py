import yaml
from collections import OrderedDict
from pathlib import Path

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    print_warning,
    print_success,
    read_yaml,
    validate_semver,
    write_yaml,
)

app_name = "kube-prometheus-stack"
MIN_VERSION = validate_semver("54.0.0")
OUTPUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "static"
    / "compatibilities"
    / f"{app_name}.yaml"
)
HELM_INDEX_URL = "https://prometheus-community.github.io/helm-charts/index.yaml"


def fetch_chart_index():
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return None
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse helm index: {exc}")
        return None


def kube_range_to_list(kube_version: str) -> list[str]:
    if not kube_version:
        return []

    parts = kube_version.replace(" ", "").split(",")
    min_version_str = None
    for part in parts:
        for token in part.replace(">=", "").split("<"):
            sem = validate_semver(token.lstrip("v").replace("-0", ""))
            if sem:
                min_version_str = f"{sem.major}.{sem.minor}"
                break
        if min_version_str:
            break

    if not min_version_str:
        return []

    current = current_kube_version()
    if not current:
        return []

    return expand_kube_versions(min_version_str, current)


def build_rows():
    index = fetch_chart_index()
    if not index:
        return []

    entries = index.get("entries", {}).get(app_name, [])
    if not entries:
        print_error("No chart entries found in helm index.")
        return []

    rows: list[OrderedDict[str, object]] = []
    for chart in entries:
        chart_version = chart.get("version", "").lstrip("v")
        if not chart_version:
            continue

        kube_versions = kube_range_to_list(chart.get("kubeVersion", ""))
        if not kube_versions:
            continue

        semver = validate_semver(chart_version)
        if not semver or (MIN_VERSION and semver < MIN_VERSION):
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", str(semver)),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    # Keep only the newest entry per major.minor to avoid huge tables with identical kube ranges
    rows.sort(key=lambda r: validate_semver(r["version"]), reverse=True)
    deduped: list[OrderedDict[str, object]] = []
    seen = set()
    for row in rows:
        ver = validate_semver(row["version"])
        if MIN_VERSION and ver < MIN_VERSION:
            break
        key = ver.major
        if key in seen:
            continue
        seen.add(key)
        row["kube"] = sorted(row["kube"], key=lambda v: validate_semver(v), reverse=True)
        deduped.append(row)

    if not deduped:
        print_warning("Parsed chart index but no usable compatibility rows found.")
    return deduped


def scrape():
    rows = build_rows()
    if not rows:
        print_error("No compatibility rows parsed.")
        return

    existing = read_yaml(OUTPUT_PATH) or {}
    existing["versions"] = rows
    if not write_yaml(OUTPUT_PATH, existing):
        print_error("Failed to write compatibility info for kube-prometheus-stack.")
    else:
        print_success("Updated compatibility table from kube-prometheus-stack helm index.")
