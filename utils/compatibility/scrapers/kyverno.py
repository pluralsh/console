from __future__ import annotations

import re
from collections import OrderedDict
from typing import Optional

from bs4 import BeautifulSoup
from utils import (
    expand_kube_versions,
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
)

app_name = "kyverno"
compatibility_url = "https://kyverno.io/docs/installation/releases/"


def _find_compat_table(soup: BeautifulSoup):
    """Find the release support table by its row labels.

    Kyverno's releases page currently publishes compatibility as a two-column
    key/value table instead of the older three-column compatibility matrix.
    """
    for table in soup.find_all("table"):
        labels = {
            cells[0].get_text(" ", strip=True).rstrip(":").lower()
            for row in table.find_all("tr")
            if len(cells := row.find_all(["td", "th"])) >= 2
        }
        if {
            "supported release",
            "kubernetes versions supported",
        }.issubset(labels):
            return table
    return None


def _normalize_version(ver: str) -> Optional[str]:
    # Accept formats like "1.19.x", "v1.19", or "v1.19 (released: Aug 2026)".
    match = re.search(r"v?(\d+)\.(\d+)", ver.strip())
    if not match:
        return None
    major, minor = match.groups()
    return f"{major}.{minor}.0"


def _parse_kube_range(value: str) -> list[str]:
    match = re.search(
        r"v?(\d+\.\d+)\s*(?:-|–|—|to)\s*v?(\d+\.\d+)",
        value,
        flags=re.IGNORECASE,
    )
    if not match:
        return []

    start, end = match.groups()
    try:
        return expand_kube_versions(start, end)
    except (ValueError, AttributeError):
        return []


def _parse_rows(table) -> list[OrderedDict[str, object]]:
    values: dict[str, str] = {}
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        key = cells[0].get_text(" ", strip=True).rstrip(":").lower()
        values[key] = cells[1].get_text(" ", strip=True)

    kyverno_version = _normalize_version(values.get("supported release", ""))
    kube_versions = _parse_kube_range(
        values.get("kubernetes versions supported", "")
    )
    if not kyverno_version or not kube_versions:
        return []

    chart_versions = get_chart_versions(app_name)
    return [
        OrderedDict(
            [
                ("version", kyverno_version),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
                ("chart_version", chart_versions.get(kyverno_version)),
            ]
        )
    ]


def scrape() -> None:
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    soup = BeautifulSoup(page_content, "html.parser")
    table = _find_compat_table(soup)
    if not table:
        print_error("Kyverno release compatibility table not found")
        return

    rows = _parse_rows(table)
    if not rows:
        print_error("No compatibility rows parsed for Kyverno")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)
