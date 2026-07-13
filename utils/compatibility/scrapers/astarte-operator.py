from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "astarte-operator"
DOCS_URL = "https://docs.astarte-platform.org/astarte-kubernetes-operator/latest/001-intro_administrator.html"
HELM_INDEX_URL = "https://helm.astarte-platform.org/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content


def _fetch_index():
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return None
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Astarte Operator helm index: {exc}")
        return None


def _normalize_version(value: str) -> str | None:
    match = re.search(r"v?(\d+\.\d+(?:\.\d+)?)", value)
    return match.group(1) if match else None


def _series_key(version: str) -> str:
    parts = version.split(".")
    return ".".join(parts[:2])


def _series_specificity(version: str) -> int:
    return len(version.split("."))


def _parse_min_kube(value: str) -> list[str]:
    match = re.search(r"v?(\d+\.\d+)\+", value)
    if not match:
        return []
    end = current_kube_version()
    if not end:
        print_error("KUBE_VERSION not available; cannot expand kube versions.")
        return []
    return expand_kube_versions(match.group(1), end)


def _latest_chart_entries(entries) -> dict[str, dict[str, str]]:
    latest: dict[str, dict[str, object]] = {}

    for chart in entries:
        raw_app = str(chart.get("appVersion", "")).lstrip("v")
        raw_chart = str(chart.get("version", "")).lstrip("v")

        app_semver = validate_semver(raw_app)
        if not app_semver:
            continue
        chart_semver = validate_semver(raw_chart)
        key = _series_key(str(app_semver))
        current = latest.get(key)

        if not current or app_semver > current["_app_semver"]:
            latest[key] = {
                "version": str(app_semver),
                "chart_version": str(chart_semver) if chart_semver else "",
                "_app_semver": app_semver,
            }

    for entry in latest.values():
        entry.pop("_app_semver", None)

    return latest


def _find_compatibility_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        if (
            "Astarte Operator Version" in headers
            and "Astarte Version" in headers
            and "Kubernetes Version" in headers
        ):
            return table, headers
    return None, []


def _parse_compatibility_rows(table, headers):
    operator_idx = headers.index("Astarte Operator Version")
    astarte_idx = headers.index("Astarte Version")
    kube_idx = headers.index("Kubernetes Version")
    rows = []

    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")]
        if len(cells) <= max(operator_idx, astarte_idx, kube_idx):
            continue

        operator_version = _normalize_version(cells[operator_idx])
        kube_versions = _parse_min_kube(cells[kube_idx])
        if not operator_version or not kube_versions:
            continue

        rows.append(
            {
                "operator_version": operator_version,
                "series": _series_key(operator_version),
                "specificity": _series_specificity(operator_version),
                "kube": kube_versions,
                "astarte": cells[astarte_idx].replace("–", "-"),
            }
        )

    return rows


def _best_row_for(entry: dict[str, str], compatibility_rows):
    version = entry["version"]
    exact = [row for row in compatibility_rows if version == row["operator_version"]]
    if exact:
        return exact[0]

    series = _series_key(version)
    series_rows = [
        row
        for row in compatibility_rows
        if row["series"] == series and row["specificity"] == 2
    ]
    return series_rows[0] if series_rows else None


def scrape():
    page_content = fetch_page(DOCS_URL)
    if not page_content:
        print_error("Failed to fetch Astarte Operator documentation.")
        return

    soup = BeautifulSoup(_decode(page_content), "html.parser")
    table, headers = _find_compatibility_table(soup)
    if not table:
        print_error("Astarte Operator compatibility matrix not found.")
        return

    compatibility_rows = _parse_compatibility_rows(table, headers)
    if not compatibility_rows:
        print_error("No Astarte Operator compatibility rows parsed.")
        return

    index = _fetch_index()
    if not index:
        return

    entries = index.get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No Astarte Operator chart entries found in helm index.")
        return

    versions = []
    for entry in _latest_chart_entries(entries).values():
        row = _best_row_for(entry, compatibility_rows)
        if not row:
            continue

        version_info = OrderedDict(
            [
                ("version", entry["version"]),
                ("kube", row["kube"]),
                ("chart_version", entry["chart_version"]),
                ("requirements", [f"Astarte {' '.join(row['astarte'].split())}"]),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    if not versions:
        print_error("No Astarte Operator versions extracted from compatibility matrix.")
        return

    update_compatibility_info(TARGET_FILE, versions)
