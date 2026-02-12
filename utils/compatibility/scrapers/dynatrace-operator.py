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


def _parse_operator_floor(value: str):
    match = re.search(r"(\d+\.\d+(?:\.\d+)?)", value)
    if not match:
        return None
    return validate_semver(match.group(1))


def _helm_versions() -> list[dict[str, object]]:
    content = fetch_page(HELM_INDEX_URL)
    if not content:
        print_error("Failed to fetch Dynatrace Operator helm index.")
        return []

    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse Dynatrace Operator helm index: {exc}")
        return []

    entries = index.get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No Dynatrace Operator chart entries found in helm index.")
        return []

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

    versions: list[dict[str, object]] = []
    for entry in by_app_version.values():
        versions.append(
            {
                "version": entry["version"],
                "chart_version": entry["chart_version"],
                "semver": entry["_app_semver"],
            }
        )

    return sorted(versions, key=lambda v: v["semver"], reverse=True)


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

    helm_versions = _helm_versions()
    if not helm_versions:
        return

    table_rows: list[dict[str, object]] = []

    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")]
        if len(cells) <= max(kube_idx, min_idx):
            continue

        kube_version = _parse_kube_version(cells[kube_idx])
        if not kube_version:
            continue

        min_floor = _parse_operator_floor(cells[min_idx])
        if not min_floor:
            continue

        table_rows.append(
            {
                "kube": kube_version,
                "min_floor": min_floor,
            }
        )

    if not table_rows:
        print_error("No Dynatrace compatibility rows parsed.")
        return

    versions: list[OrderedDict] = []
    for entry in helm_versions:
        supported_kube = set()
        semver = entry["semver"]

        for row in table_rows:
            kube_version = row["kube"]
            if semver >= row["min_floor"]:
                supported_kube.add(kube_version)

        if not supported_kube:
            continue

        sorted_kube = sorted(
            supported_kube,
            key=lambda v: tuple(map(int, v.split("."))),
            reverse=True,
        )
        version_info = OrderedDict(
            [
                ("version", entry["version"]),
                ("kube", sorted_kube),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        if entry.get("chart_version"):
            version_info["chart_version"] = entry["chart_version"]
        versions.append(version_info)

    update_compatibility_info(TARGET_FILE, versions)
