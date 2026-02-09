from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup

from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "external-secrets"
STABILITY_URL = "https://external-secrets.io/main/introduction/stability-support/"
HELM_INDEX_URL = "https://charts.external-secrets.io/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _fetch_index():
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return None
    try:
        return yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse External Secrets helm index: {exc}")
        return None


def _latest_app_versions(entries) -> dict[str, dict[str, str]]:
    latest: dict[str, dict[str, object]] = {}

    for chart in entries:
        raw_app = str(chart.get("appVersion", "")).lstrip("v")
        raw_chart = str(chart.get("version", "")).lstrip("v")

        app_semver = validate_semver(raw_app)
        if not app_semver:
            continue
        chart_semver = validate_semver(raw_chart)

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
                current["chart_version"] = str(chart_semver)
                current["_chart_semver"] = chart_semver

    for entry in latest.values():
        entry.pop("_app_semver", None)
        entry.pop("_chart_semver", None)

    return {key: entry for key, entry in latest.items()}


def _find_compat_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "ESO Version" in headers and "Kubernetes Version" in headers:
            return table, headers
    return None, []


def _parse_kube_versions(value: str) -> list[str]:
    if not value:
        return []
    cleaned = value.strip()
    range_match = re.search(
        r"(\d+)\.(\d+)\s*(?:→|->|-|–|—)\s*(\d+)\.(\d+)",
        cleaned,
    )
    if range_match:
        start = f"{range_match.group(1)}.{range_match.group(2)}"
        end = f"{range_match.group(3)}.{range_match.group(4)}"
        return expand_kube_versions(start, end)

    single_match = re.search(r"(\d+)\.(\d+)", cleaned)
    if single_match:
        return [f"{single_match.group(1)}.{single_match.group(2)}"]

    return []


def _normalize_series(value: str) -> str | None:
    match = re.search(r"(\d+)\.(\d+)", value)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def scrape() -> None:
    content = fetch_page(STABILITY_URL)
    if not content:
        print_error("Failed to fetch External Secrets stability/support page.")
        return

    soup = BeautifulSoup(content.decode("utf-8", errors="replace"), "html.parser")
    table, headers = _find_compat_table(soup)
    if not table:
        print_error("External Secrets compatibility table not found.")
        return

    try:
        eso_idx = headers.index("ESO Version")
        kube_idx = headers.index("Kubernetes Version")
    except ValueError as exc:
        print_error(f"Unexpected External Secrets table headers: {exc}")
        return

    index = _fetch_index()
    if not index:
        return

    entries = index.get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No External Secrets chart entries found in helm index.")
        return

    latest_versions = _latest_app_versions(entries)
    versions: list[OrderedDict] = []

    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")]
        if len(cells) <= max(eso_idx, kube_idx):
            continue

        series = _normalize_series(cells[eso_idx])
        kube_versions = _parse_kube_versions(cells[kube_idx])
        if not series or not kube_versions:
            continue

        entry = latest_versions.get(series)
        if not entry:
            continue

        version_info = OrderedDict(
            [
                ("version", entry["version"]),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        if entry.get("chart_version"):
            version_info["chart_version"] = entry["chart_version"]

        versions.append(version_info)

    if not versions:
        print_error("No External Secrets compatibility rows parsed.")
        return

    update_compatibility_info(TARGET_FILE, versions)
