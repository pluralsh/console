from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup

from utils import fetch_page, print_error, update_compatibility_info, validate_semver


APP_NAME = "dynatrace-operator"
SUPPORT_URL = (
    "https://docs.dynatrace.com/docs/ingest-from/technology-support/support-model-and-issues"
)
HELM_INDEX_URL = (
    "https://raw.githubusercontent.com/Dynatrace/dynatrace-operator/main/config/helm/repos/stable/index.yaml"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _find_support_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if (
            "Kubernetes upstream version" in headers
            and "Minimum Dynatrace Operator version" in headers
        ):
            return table, headers
    return None, []


def _parse_kube_version(value: str) -> str | None:
    match = re.search(r"(\d+)\.(\d+)", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def _parse_operator_series(value: str) -> str | None:
    match = re.search(r"(\d+)\.(\d+)", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def _versions_by_minor() -> dict[str, list[dict[str, str]]]:
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        print_error("Failed to fetch Dynatrace Operator helm index.")
        return {}

    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Dynatrace Operator helm index: {exc}")
        return {}

    entries = index.get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No Dynatrace Operator chart entries found in helm index.")
        return {}

    by_app_version: dict[str, dict[str, object]] = {}

    for entry in entries:
        raw_app = str(entry.get("appVersion", "")).lstrip("v")
        raw_chart = str(entry.get("version", "")).lstrip("v")

        app_semver = validate_semver(raw_app)
        if not app_semver:
            continue
        chart_semver = validate_semver(raw_chart)

        key = str(app_semver)
        current = by_app_version.get(key)
        if not current:
            by_app_version[key] = {
                "version": str(app_semver),
                "chart_version": str(chart_semver) if chart_semver else "",
                "_app_semver": app_semver,
                "_chart_semver": chart_semver,
            }
            continue

        current_chart = current["_chart_semver"]
        if chart_semver and (not current_chart or chart_semver > current_chart):
            current["chart_version"] = str(chart_semver)
            current["_chart_semver"] = chart_semver

    by_minor: dict[str, list[dict[str, str]]] = {}
    for entry in by_app_version.values():
        app_semver = entry["_app_semver"]
        key = f"{app_semver.major}.{app_semver.minor}"
        by_minor.setdefault(key, []).append(entry)

    for entry_list in by_minor.values():
        for entry in entry_list:
            entry.pop("_app_semver", None)
            entry.pop("_chart_semver", None)

    return by_minor


def scrape() -> None:
    content = fetch_page(SUPPORT_URL)
    if not content:
        print_error("Failed to fetch Dynatrace support model page.")
        return

    soup = BeautifulSoup(content.decode("utf-8", errors="replace"), "html.parser")
    table, headers = _find_support_table(soup)
    if not table:
        print_error("Dynatrace compatibility table not found.")
        return

    try:
        kube_idx = headers.index("Kubernetes upstream version")
        min_idx = headers.index("Minimum Dynatrace Operator version")
    except ValueError as exc:
        print_error(f"Unexpected Dynatrace table headers: {exc}")
        return

    versions_by_minor = _versions_by_minor()
    if not versions_by_minor:
        return

    kube_by_series: dict[str, set[str]] = {}

    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")]
        if len(cells) <= max(kube_idx, min_idx):
            continue

        kube_version = _parse_kube_version(cells[kube_idx])
        if not kube_version:
            continue

        series = _parse_operator_series(cells[min_idx])
        if not series:
            continue

        kube_by_series.setdefault(series, set()).add(kube_version)

    if not kube_by_series:
        print_error("No Dynatrace compatibility rows parsed.")
        return

    versions: list[OrderedDict] = []
    for series, kube_set in kube_by_series.items():
        entries = versions_by_minor.get(series, [])
        for entry in entries:
            version_info = OrderedDict(
                [
                    ("version", entry["version"]),
                    ("kube", sorted(kube_set)),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
            if entry.get("chart_version"):
                version_info["chart_version"] = entry["chart_version"]
            versions.append(version_info)

    update_compatibility_info(TARGET_FILE, versions)
