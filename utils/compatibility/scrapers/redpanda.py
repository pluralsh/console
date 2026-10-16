from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup

from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    read_yaml,
    update_compatibility_info,
    validate_semver,
    write_yaml,
)


app_name = "redpanda"
HELM_INDEX_URL = "https://charts.redpanda.com/index.yaml"
COMPAT_MATRIX_URL = "https://docs.redpanda.com/current/upgrade/k-compatibility/"
TARGET_FILE = f"../../static/compatibilities/{app_name}.yaml"


def _fetch_index():
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return None
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Redpanda helm index: {exc}")
        return None


def _fetch_matrix() -> BeautifulSoup | None:
    content = fetch_page(COMPAT_MATRIX_URL)
    if not content:
        print_error("Failed to fetch Redpanda compatibility matrix page.")
        return None
    return BeautifulSoup(content, "html.parser")


def _parse_table(table) -> tuple[list[str], list[list[str | None]]]:
    rows = table.find_all("tr")
    headers = [
        header.get_text(" ", strip=True)
        for header in rows[0].find_all(["th", "td"])
    ]
    col_count = len(headers)
    spans: list[dict[str, object] | None] = [None] * col_count
    data: list[list[str | None]] = []

    for row in rows[1:]:
        cells = row.find_all(["td", "th"])
        row_values: list[str | None] = [None] * col_count

        for idx in range(col_count):
            span = spans[idx]
            if span:
                row_values[idx] = span["value"]  # type: ignore[index]
                span["rows_left"] = int(span["rows_left"]) - 1  # type: ignore[index]
                if span["rows_left"] <= 0:  # type: ignore[index]
                    spans[idx] = None

        col_idx = 0
        for cell in cells:
            while col_idx < col_count and row_values[col_idx] is not None:
                col_idx += 1

            text = cell.get_text(" ", strip=True)
            colspan = int(cell.get("colspan", 1))
            rowspan = int(cell.get("rowspan", 1))

            for offset in range(colspan):
                if col_idx + offset >= col_count:
                    break
                row_values[col_idx + offset] = text
                if rowspan > 1:
                    spans[col_idx + offset] = {
                        "value": text,
                        "rows_left": rowspan - 1,
                    }

            col_idx += colspan

        data.append(row_values)

    return headers, data


def _normalize_series(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(\d+)\.(\d+)\.x", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def _parse_kube_range(value: str | None) -> list[str]:
    if not value:
        return []
    cleaned = re.sub(r"\[[^\]]*\]", "", value).strip()
    cleaned = cleaned.replace("–", "-")
    match = re.search(
        r"(\d+)\.(\d+)\.x\s*-\s*(\d+)\.(\d+)\.x", cleaned
    )
    if not match:
        return []
    min_version = f"{match.group(1)}.{match.group(2)}"
    max_version = f"{match.group(3)}.{match.group(4)}"
    return expand_kube_versions(min_version, max_version)


def _compat_matrix() -> dict[str, list[str]]:
    soup = _fetch_matrix()
    if not soup:
        return {}

    heading = None
    for h2 in soup.find_all("h2"):
        if "Compatibility matrix" in h2.get_text(" ", strip=True):
            heading = h2
            break

    if not heading:
        print_error("Compatibility matrix heading not found on Redpanda docs page.")
        return {}

    table = heading.find_next("table")
    if not table:
        print_error("Compatibility matrix table not found on Redpanda docs page.")
        return {}

    headers, rows = _parse_table(table)
    try:
        core_idx = headers.index("Redpanda Core / rpk")
        helm_idx = headers.index("Helm Chart")
        operator_chart_idx = headers.index("Operator Helm Chart")
        operator_idx = headers.index("Operator")
        kube_idx = headers.index("Kubernetes")
    except ValueError as exc:
        print_error(f"Unexpected Redpanda compatibility table headers: {exc}")
        return {}

    matrix: dict[str, list[str]] = {}
    for row in rows:
        core_series = _normalize_series(row[core_idx])
        kube_versions = _parse_kube_range(row[kube_idx])
        if not core_series or not kube_versions:
            continue

        helm_series = _normalize_series(row[helm_idx])
        operator_chart_series = _normalize_series(row[operator_chart_idx])
        operator_series = _normalize_series(row[operator_idx])

        if helm_series and helm_series != core_series:
            continue
        if operator_chart_series and operator_chart_series != core_series:
            continue
        if operator_series and operator_series != core_series:
            continue

        matrix[core_series] = kube_versions

    return matrix


def _latest_app_versions(entries) -> dict[str, dict[str, str]]:
    latest: dict[str, dict[str, str]] = {}

    for chart in entries:
        raw_app_version = str(chart.get("appVersion", "")).lstrip("v")
        raw_chart_version = str(chart.get("version", "")).lstrip("v")

        app_semver = validate_semver(raw_app_version)
        if not app_semver:
            continue
        chart_semver = validate_semver(raw_chart_version)

        key = f"{app_semver.major}.{app_semver.minor}"
        current = latest.get(key)
        if not current:
            latest[key] = {
                "version": str(app_semver),
                "chart_version": str(chart_semver) if chart_semver else "",
                "_app_semver": app_semver,
                "_chart_semver": chart_semver,
            }
            continue

        current_app = current["_app_semver"]
        current_chart = current["_chart_semver"]

        if app_semver > current_app:
            latest[key] = {
                "version": str(app_semver),
                "chart_version": str(chart_semver) if chart_semver else "",
                "_app_semver": app_semver,
                "_chart_semver": chart_semver,
            }
        elif app_semver == current_app and chart_semver:
            if not current_chart or chart_semver > current_chart:
                latest[key]["chart_version"] = str(chart_semver)
                latest[key]["_chart_semver"] = chart_semver

    for entry in latest.values():
        entry.pop("_app_semver", None)
        entry.pop("_chart_semver", None)

    return latest


def scrape() -> None:
    matrix = _compat_matrix()
    if not matrix:
        print_error("No Redpanda compatibility matrix data extracted.")
        return

    index = _fetch_index()
    if not index:
        return

    entries = index.get("entries", {}).get(app_name, [])
    if not entries:
        print_error("No Redpanda chart entries found in helm index.")
        return

    latest_versions = _latest_app_versions(entries)
    versions: list[OrderedDict] = []
    for core_minor, kube_versions in matrix.items():
        entry = latest_versions.get(core_minor)
        version = entry["version"] if entry else f"{core_minor}.0"

        version_info = OrderedDict(
            [
                ("version", version),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        if entry and entry.get("chart_version"):
            version_info["chart_version"] = entry["chart_version"]

        versions.append(version_info)

    if not versions:
        print_error("No Redpanda compatibility rows parsed.")
        return

    existing = read_yaml(TARGET_FILE)
    if not existing:
        print_error("Missing Redpanda compatibility YAML metadata.")
        return

    existing["versions"] = []
    if not write_yaml(TARGET_FILE, existing):
        print_error("Failed to reset Redpanda compatibility versions.")
        return

    update_compatibility_info(TARGET_FILE, versions)
