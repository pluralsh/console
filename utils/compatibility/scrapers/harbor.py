from __future__ import annotations

import re
from collections import OrderedDict

from utils import fetch_page, print_error, update_compatibility_info, validate_semver


APP_NAME = "harbor"
README_URL = "https://raw.githubusercontent.com/goharbor/harbor-helm/main/README.md"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _extract_table_lines(text: str) -> list[str]:
    lines = text.splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if "Harbor Kubernetes Version Compatibility Matrix" in line:
            start_idx = idx
            break

    if start_idx is None:
        return []

    table_lines: list[str] = []
    for line in lines[start_idx:]:
        if line.strip().startswith("|"):
            table_lines.append(line)
        elif table_lines:
            break

    return table_lines


def _parse_rows(table_lines: list[str]) -> list[list[str]]:
    if len(table_lines) < 3:
        return []

    rows: list[list[str]] = []
    for line in table_lines[2:]:
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(parts) < 3:
            continue
        rows.append(parts[:3])
    return rows


def _normalize_version(value: str) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lstrip("v")
    semver = validate_semver(cleaned)
    return str(semver) if semver else None


def _normalize_kube_list(value: str) -> list[str]:
    if not value:
        return []
    versions = {
        f"{match.group(1)}.{match.group(2)}"
        for match in re.finditer(r"(\d+)\.(\d+)", value)
    }
    return sorted(
        versions, key=lambda v: tuple(int(x) for x in v.split(".")), reverse=True
    )


def scrape() -> None:
    content = fetch_page(README_URL)
    if not content:
        return

    text = content.decode("utf-8", errors="replace")
    table_lines = _extract_table_lines(text)
    if not table_lines:
        print_error("Harbor compatibility matrix table not found in README.")
        return

    rows = _parse_rows(table_lines)
    if not rows:
        print_error("No Harbor compatibility rows parsed.")
        return

    versions: list[OrderedDict] = []
    for chart_version, app_version, kube_text in rows:
        app_semver = _normalize_version(app_version)
        chart_semver = _normalize_version(chart_version)
        kube_versions = _normalize_kube_list(kube_text)

        if not app_semver or not kube_versions:
            continue

        version_info = OrderedDict(
            [
                ("version", app_semver),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )

        if chart_semver:
            version_info["chart_version"] = chart_semver

        versions.append(version_info)

    if not versions:
        print_error("No Harbor compatibility rows parsed.")
        return

    update_compatibility_info(TARGET_FILE, versions)
