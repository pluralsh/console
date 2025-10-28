from __future__ import annotations

import re
from collections import OrderedDict

from bs4 import BeautifulSoup
from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    latest_kube_version,
    print_error,
    update_compatibility_info,
)

app_name = "strimzi-kafka"
downloads_url = "https://strimzi.io/downloads/"


def _latest_minor() -> str | None:
    cur = current_kube_version()
    if cur:
        return cur
    latest = latest_kube_version()
    if not latest:
        return None
    return f"{latest.major}.{latest.minor}"


def _parse_kube_cell(text: str) -> list[str]:
    # Normalize whitespace and remove footnote numbers
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s*\[[^\]]*\]", "", cleaned)  # strip bracket notes if any

    # Patterns: "1.27+", "v1.27+", "1.23+ 2", "1.21 - 1.25"
    m_plus = re.search(r"v?(\d+\.\d+)\s*\+", cleaned)
    if m_plus:
        start = m_plus.group(1)
        latest_minor = _latest_minor()
        if not latest_minor:
            return []
        return expand_kube_versions(start, latest_minor)

    m_range = re.search(r"v?(\d+\.\d+)\s*-\s*v?(\d+\.\d+)", cleaned)
    if m_range:
        start, end = m_range.groups()
        return expand_kube_versions(start, end)

    # Fallback: try comma separated explicit minors
    parts = [p.strip().lstrip("v") for p in cleaned.split(",")]
    return [p for p in parts if re.match(r"^\d+\.\d+$", p)]


def _find_supported_versions_table(soup: BeautifulSoup):
    # Look for a table which has a header cell "Kubernetes versions"
    for table in soup.find_all("table"):
        ths = [th.get_text(strip=True).lower() for th in table.find_all("th")]
        if any("kubernetes versions" == th for th in ths):
            return table
    return None


def _parse_rows(table) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []
    tbody = table.find("tbody") or table
    # Identify column indices based on header labels
    header_cells = [th.get_text(strip=True).lower() for th in table.find_all("th")]
    try:
        op_idx = header_cells.index("operators")
        k8s_idx = header_cells.index("kubernetes versions")
    except ValueError:
        # Fallback to assumed positions: operators at 0, k8s at last
        op_idx = 0
        k8s_idx = -1

    for tr in tbody.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) < max(op_idx, k8s_idx if k8s_idx >= 0 else 0) + 1:
            continue
        op_text = cells[op_idx].get_text(strip=True)
        k8s_text = cells[k8s_idx].get_text(" ", strip=True) if k8s_idx >= 0 else ""

        # Parse Strimzi operator version
        m = re.search(r"(\d+\.\d+\.\d+)", op_text)
        if not m:
            continue
        operator_version = m.group(1)

        kube_versions = _parse_kube_cell(k8s_text)
        if not kube_versions:
            continue

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

    rows = _parse_rows(table)
    if not rows:
        print_error("No Strimzi compatibility rows parsed")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
