from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version

from utils import fetch_page, print_error, update_compatibility_info


APP_NAME = "yunikorn"
SUPPORT_MATRIX_URL = (
    "https://raw.githubusercontent.com/apache/yunikorn-site/master/"
    "docs/get_started/version.md"
)
HELM_INDEX_URL = "https://apache.github.io/yunikorn-release/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"

SUPPORT_HEADING_VARIANTS = {
    "kubernetes versions supported by yunikorn",
    "supported k8s versions",
}


def _parse_version(value: str) -> Version | None:
    try:
        parsed = Version(value.strip().lstrip("v"))
    except InvalidVersion:
        return None
    if parsed.is_prerelease or parsed.is_devrelease:
        return None
    return parsed


def _heading_text(line: str) -> str:
    """Normalize a Markdown heading while preserving fail-closed matching."""
    return line.lstrip("#").strip().lower()


def parse_support_matrix(markdown: str) -> list[tuple[str, Version, Version | None]] | None:
    """Parse the official YuniKorn Kubernetes support table.

    The table is authoritative. Open-ended support is intentionally bounded to
    Kubernetes minors that are explicitly present in the table; callers must
    not extend it to Plural's current KUBE_VERSION or to E2E-only versions.
    """

    lines = markdown.splitlines()
    heading_seen = False
    table_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") and _heading_text(stripped) in SUPPORT_HEADING_VARIANTS:
            heading_seen = True
            continue
        if not heading_seen:
            continue
        if stripped.startswith("|"):
            table_lines.append(stripped)
        elif table_lines:
            break

    if len(table_lines) < 3:
        return None

    headers = [cell.strip().lower() for cell in table_lines[0].strip("|").split("|")]
    if len(headers) != 3:
        return None
    if (
        "k8s version" not in headers[0]
        or "supported" not in headers[1]
        or "support ended" not in headers[2]
    ):
        return None

    rules: list[tuple[str, Version, Version | None]] = []

    for line in table_lines[2:]:
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 3:
            return None

        kube_match = re.search(r"(\d+\.\d+)\.x", cells[0])
        if not kube_match:
            # The intentionally unsupported floor row has no usable minor.
            # If a future supported row changes shape, fail closed instead of guessing.
            if cells[1] == "-" and cells[2] == "-":
                continue
            return None

        if cells[1] == "-":
            if cells[2] != "-":
                return None
            continue

        start = _parse_version(cells[1])
        if start is None:
            return None

        end: Version | None = None
        if cells[2] != "-":
            end = _parse_version(cells[2])
            if end is None or end <= start:
                return None

        rules.append((kube_match.group(1), start, end))

    if not rules:
        return None

    return rules


def parse_helm_index(content: bytes) -> dict[str, str] | None:
    """Return source-qualified stable appVersion -> chart version mappings."""

    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError:
        return None

    if not isinstance(index, dict):
        return None

    all_entries = index.get("entries")
    if not isinstance(all_entries, dict):
        return None

    entries = all_entries.get(APP_NAME)
    if not isinstance(entries, list) or not entries:
        return None

    mappings: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            return None

        app_version = str(entry.get("appVersion", "")).strip().lstrip("v")
        chart_version = str(entry.get("version", "")).strip().lstrip("v")
        app_parsed = _parse_version(app_version)
        chart_parsed = _parse_version(chart_version)
        if app_parsed is None or chart_parsed is None:
            continue

        # The official YuniKorn chart index publishes matching app/chart versions.
        # Reject conflicting mappings rather than inferring across releases.
        if app_version != chart_version:
            return None

        existing = mappings.get(app_version)
        if existing is not None and existing != chart_version:
            return None
        mappings[app_version] = chart_version

    return mappings or None


def build_rows(
    rules: list[tuple[str, Version, Version | None]],
    chart_versions: dict[str, str],
) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []

    for app_version in sorted(chart_versions, key=Version):
        parsed = Version(app_version)
        kube_versions = [
            kube_version
            for kube_version, start, end in rules
            if parsed >= start and (end is None or parsed < end)
        ]
        if not kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_versions[app_version]),
                ]
            )
        )

    return rows


def scrape() -> None:
    matrix_content = fetch_page(SUPPORT_MATRIX_URL)
    if not matrix_content:
        print_error("Failed to fetch YuniKorn support matrix")
        return

    helm_content = fetch_page(HELM_INDEX_URL)
    if not helm_content:
        print_error("Failed to fetch YuniKorn Helm index")
        return

    try:
        markdown = matrix_content.decode("utf-8")
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode YuniKorn support matrix: {exc}")
        return

    rules = parse_support_matrix(markdown)
    if rules is None:
        print_error("Failed to parse YuniKorn support matrix")
        return

    chart_versions = parse_helm_index(helm_content)
    if chart_versions is None:
        print_error("Failed to parse YuniKorn Helm index")
        return

    rows = build_rows(rules, chart_versions)
    if not rows:
        print_error("No YuniKorn compatibility rows generated")
        return

    update_compatibility_info(TARGET_FILE, rows)


if __name__ == "__main__":
    scrape()
