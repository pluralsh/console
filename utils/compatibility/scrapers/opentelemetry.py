from __future__ import annotations

import re
from collections import OrderedDict
from typing import Iterable

from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
)

app_name = "opentelemetry"
markdown_url = (
    "https://raw.githubusercontent.com/open-telemetry/opentelemetry-operator/main/docs/compatibility.md"
)


def fetch_markdown() -> str | None:
    content = fetch_page(markdown_url)
    if not content:
        return None

    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        print_error(f"Failed to decode compatibility markdown: {exc}")
        return None


def extract_table_lines(markdown: str) -> list[str]:
    lines = markdown.splitlines()
    table_lines: list[str] = []
    capturing = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("| OpenTelemetry Operator "):
            capturing = True
        if not capturing:
            continue
        if not stripped:
            if table_lines:
                break
            continue
        if stripped.startswith("|"):
            table_lines.append(stripped)
        elif table_lines:
            break

    return table_lines


def parse_kube_versions(value: str) -> list[str]:
    cleaned = value.replace("\u2013", "-").strip()
    if not cleaned or cleaned.upper() == "N/A":
        return []

    range_match = re.match(r"v?(\d+\.\d+)\s+to\s+v?(\d+\.\d+)", cleaned)
    if range_match:
        start, end = range_match.groups()
        return expand_kube_versions(start, end)

    versions = [item.strip().lstrip("v") for item in cleaned.split(",")]
    return [version for version in versions if version]


def parse_rows(table_lines: Iterable[str]) -> list[OrderedDict[str, object]]:
    lines = list(table_lines)
    if len(lines) < 3:
        return []

    rows: list[OrderedDict[str, object]] = []
    for line in lines[2:]:  # skip header and separator
        columns = [column.strip() for column in line.strip("|").split("|")]
        if len(columns) != 4:
            continue

        operator_col, kube_col, cert_col, prom_col = columns
        match = re.search(r"v?(\d+\.\d+\.\d+)", operator_col)
        if not match:
            continue

        version = match.group(1).lstrip("v")
        kube_versions = parse_kube_versions(kube_col)
        if not kube_versions:
            continue

        version_info = OrderedDict(
            [
                ("version", version),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )

        rows.append(version_info)

    return rows


def scrape() -> None:
    markdown = fetch_markdown()
    if not markdown:
        return

    table_lines = extract_table_lines(markdown)
    if not table_lines:
        print_error("No compatibility table found for OpenTelemetry operator")
        return

    rows = parse_rows(table_lines)
    if not rows:
        print_error("Failed to parse compatibility table rows for OpenTelemetry operator")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name)
