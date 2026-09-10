from __future__ import annotations

import re
from collections import OrderedDict
from copy import deepcopy

from bs4 import BeautifulSoup
from utils import (
    current_kube_version,
    ensure_keys,
    fetch_page,
    get_chart_versions,
    print_error,
    read_yaml,
    reduce_versions,
    update_compatibility_info,
    validate_semver,
)

app_name = "strimzi-kafka"
downloads_url = "https://strimzi.io/downloads/"
target_file = f"../../static/compatibilities/{app_name}.yaml"
chart_name = "strimzi-kafka-operator"
kube_headers = {"kubernetes versions", "tested kubernetes versions"}
# Records through 0.50.0 predate the finite tested-version matrix migration.
# Freeze that legacy history, but allow later missing releases and backports.
legacy_version_cutoff = validate_semver("0.50.0")


def _latest_minor() -> str | None:
    cur = current_kube_version()
    if cur and re.fullmatch(r"\d+\.\d+", cur):
        return cur
    return None


def _expand_range(start: str, end: str) -> list[str]:
    start_major, start_minor = map(int, start.split("."))
    end_major, end_minor = map(int, end.split("."))
    if start_major != end_major or start_minor > end_minor:
        return []
    return [f"{start_major}.{minor}" for minor in range(start_minor, end_minor + 1)]


def _parse_kube_cell(text: str) -> list[str]:
    # Only the compatibility matrix supplies these values, never a dependency floor.
    cleaned = re.sub(r"\s+", " ", text).strip()

    # Patterns: "1.27+", "v1.27+", "1.21 - 1.25" (footnotes removed in _cell_text).
    m_plus = re.fullmatch(r"v?(\d+\.\d+)\s*\+", cleaned)
    if m_plus:
        start = m_plus.group(1)
        latest_minor = _latest_minor()
        if not latest_minor:
            return []
        return _expand_range(start, latest_minor)

    m_range = re.fullmatch(r"v?(\d+\.\d+)\s*[-–—]\s*v?(\d+\.\d+)", cleaned)
    if m_range:
        start, end = m_range.groups()
        return _expand_range(start, end)

    # Fallback: try comma separated explicit minors
    parts = [p.strip().lstrip("v") for p in cleaned.split(",")]
    if not all(re.fullmatch(r"\d+\.\d+", p) for p in parts):
        return []
    return list(dict.fromkeys(parts))


def _cell_text(cell) -> str:
    # Footnote markers are presentation, not part of a version or header label.
    return " ".join(
        text.strip() for text in cell.find_all(string=True)
        if text.strip() and text.find_parent("sup") is None
    )


def _headers(table) -> list[str]:
    return [_cell_text(th).lower() for th in table.find_all("th")]


def _find_supported_versions_table(soup: BeautifulSoup):
    # The current page labels its finite verified window "Tested Kubernetes versions".
    for table in soup.find_all("table"):
        ths = _headers(table)
        if "operators" in ths and any(th in kube_headers for th in ths):
            return table
    return None


def _parse_rows(table) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []
    tbody = table.find("tbody") or table
    # Identify column indices based on header labels
    header_cells = _headers(table)
    try:
        op_idx = header_cells.index("operators")
        k8s_idx = next(i for i, label in enumerate(header_cells) if label in kube_headers)
    except (ValueError, StopIteration):
        raise ValueError("Strimzi compatibility table is missing required headers")

    for tr in tbody.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue
        if len(cells) <= max(op_idx, k8s_idx):
            raise ValueError("Incomplete Strimzi compatibility row")
        op_text = _cell_text(cells[op_idx])
        k8s_text = _cell_text(cells[k8s_idx])

        # Parse Strimzi operator version
        m = re.fullmatch(r"v?(\d+\.\d+\.\d+)", op_text)
        if not m:
            continue
        operator_version = m.group(1)

        kube_versions = _parse_kube_cell(k8s_text)
        if not kube_versions:
            raise ValueError(f"Invalid Strimzi Kubernetes compatibility for {operator_version}")

        rows.append(
            OrderedDict(
                [
                    ("version", operator_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape() -> None:
    content = fetch_page(downloads_url)
    if not content:
        print_error("Failed to fetch Strimzi downloads page")
        return

    soup = BeautifulSoup(content, "html.parser")
    table = _find_supported_versions_table(soup)
    if not table:
        print_error("Strimzi supported versions table not found")
        return

    try:
        rows = _parse_rows(table)
    except ValueError as error:
        print_error(str(error))
        return
    if not rows:
        print_error("No Strimzi compatibility rows parsed")
        return

    existing = read_yaml(target_file)
    if not existing or not existing.get("versions"):
        print_error("Could not read existing Strimzi compatibility versions")
        return
    recorded_versions = {row["version"] for row in existing["versions"]}
    rows = [
        ensure_keys(row) for row in rows
        if validate_semver(row["version"]) > legacy_version_cutoff
        and row["version"] not in recorded_versions
    ]
    if not rows:
        return
    charts = get_chart_versions(app_name, chart_name=chart_name)
    if not charts:
        print_error("Could not read official Strimzi chart versions")
        return
    released_rows = []
    for row in rows:
        chart = charts.get(row["version"])
        if chart and validate_semver(chart):
            row["chart_version"] = chart
            released_rows.append(row)
    # Reduce only chart-backed candidates. An unavailable .0 chart must not
    # hide a usable patch with the same compatibility window. Including existing
    # rows preserves delayed/backport boundaries and makes unchanged patches no-ops.
    retained_versions = {
        row["version"] for row in reduce_versions(deepcopy(existing["versions"]) + released_rows)
    }
    released_rows = [row for row in released_rows if row["version"] in retained_versions]
    if released_rows:
        update_compatibility_info(target_file, released_rows)
