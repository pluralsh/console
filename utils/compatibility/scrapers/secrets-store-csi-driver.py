from __future__ import annotations

import re
from collections import OrderedDict
from typing import Any

import yaml
from packaging.version import Version

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "secrets-store-csi-driver"
HELM_INDEX_URL = "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
KUBE_CONSTRAINT_RE = re.compile(
    r"(?P<operator><=|>=|<|>)\s*v?(?P<major>\d+)\.(?P<minor>\d+)(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?"
)


def _decode(content: bytes | str) -> str:
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _minor(version: str) -> str:
    parsed = validate_semver(version)
    if not parsed:
        raise ValueError(f"Invalid Kubernetes version: {version}")
    return f"{parsed.major}.{parsed.minor}"


def _previous_minor(version: str) -> str:
    parsed = validate_semver(version)
    if not parsed:
        raise ValueError(f"Invalid Kubernetes version: {version}")
    major = parsed.major
    minor = parsed.minor - 1
    if minor < 0:
        major -= 1
        minor = 99
    return f"{major}.{minor}"


def _newer_minor(left: str, right: str) -> str:
    return str(max(Version(left), Version(right)))


def _older_minor(left: str, right: str) -> str:
    return str(min(Version(left), Version(right)))


def kube_versions_from_constraint(constraint: str, latest_kube: str) -> list[str]:
    """Convert Helm kubeVersion constraints into Plural's minor-version list."""
    text = str(constraint or "").strip()
    matches = list(KUBE_CONSTRAINT_RE.finditer(text))
    if not matches:
        raise ValueError(f"Unsupported kubeVersion constraint: {constraint!r}")

    start = None
    end = _minor(latest_kube)
    for match in matches:
        operator = match.group("operator")
        version = f"{match.group('major')}.{match.group('minor')}.0"
        minor = _minor(version)

        if operator == ">=":
            start = minor if start is None else _newer_minor(start, minor)
        elif operator == ">":
            next_minor = f"{match.group('major')}.{int(match.group('minor')) + 1}"
            start = next_minor if start is None else _newer_minor(start, next_minor)
        elif operator == "<":
            end = _older_minor(end, _previous_minor(version))
        elif operator == "<=":
            end = _older_minor(end, minor)

    if start is None:
        raise ValueError(f"kubeVersion has no lower bound: {constraint!r}")
    if Version(start) > Version(end):
        return []
    return expand_kube_versions(start, end)


def _load_index(content: bytes | str) -> dict[str, Any]:
    try:
        index = yaml.safe_load(_decode(content))
    except yaml.YAMLError as exc:
        raise ValueError(f"Could not parse Secrets Store CSI Driver Helm index: {exc}") from exc

    if not isinstance(index, dict):
        raise ValueError("Unexpected Secrets Store CSI Driver Helm index payload")
    entries = index.get("entries")
    if not isinstance(entries, dict):
        raise ValueError("Secrets Store CSI Driver Helm index has no entries map")
    return index


def build_rows(index_content: bytes | str, latest_kube: str) -> list[OrderedDict]:
    index = _load_index(index_content)
    entries = index["entries"].get(APP_NAME)
    if not isinstance(entries, list) or not entries:
        raise ValueError("Secrets Store CSI Driver chart entries not found")

    selected: dict[tuple[int, int, tuple[str, ...]], dict[str, Any]] = {}
    for chart in entries:
        if not isinstance(chart, dict):
            continue

        app_version = validate_semver(str(chart.get("appVersion", "")).lstrip("v"))
        chart_version = validate_semver(str(chart.get("version", "")).lstrip("v"))
        if not app_version or not chart_version:
            continue

        kube_versions = kube_versions_from_constraint(
            str(chart.get("kubeVersion", "")), latest_kube
        )
        if not kube_versions:
            continue

        key = (app_version.major, app_version.minor, tuple(kube_versions))
        current = selected.get(key)
        if (
            current is None
            or app_version > current["_app_version"]
            or (
                app_version == current["_app_version"]
                and chart_version > current["_chart_version"]
            )
        ):
            selected[key] = {
                "_app_version": app_version,
                "_chart_version": chart_version,
                "row": OrderedDict(
                    [
                        ("version", str(app_version)),
                        ("kube", kube_versions),
                        ("chart_version", str(chart_version)),
                        ("images", []),
                        ("requirements", []),
                        ("incompatibilities", []),
                    ]
                ),
            }

    rows = [entry["row"] for entry in selected.values()]
    rows.sort(key=lambda row: Version(row["version"]), reverse=True)
    if not rows:
        raise ValueError("No stable Secrets Store CSI Driver chart rows found")
    return rows


def scrape() -> None:
    index_content = fetch_page(HELM_INDEX_URL)
    if not index_content:
        print_error("Failed to fetch Secrets Store CSI Driver Helm index.")
        return

    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not read current Kubernetes version.")
        return

    try:
        rows = build_rows(index_content, latest_kube)
    except ValueError as exc:
        print_error(str(exc))
        return

    update_compatibility_info(TARGET_FILE, rows)
