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


def _find_release_table(soup: BeautifulSoup):
    """Find the current supported-release table in Kyverno's release docs."""
    for table in soup.find_all("table"):
        text = table.get_text(" ", strip=True).lower()
        if (
            "supported release" in text
            and "kubernetes versions supported" in text
        ):
            return table
    return None


def _normalize_version(value: str) -> Optional[str]:
    """Normalize release labels such as v1.19 or v1.19.0 to x.y.0."""
    match = re.search(r"v?(\d+)\.(\d+)", value.strip())
    if not match:
        return None
    major, minor = match.groups()
    return f"{major}.{minor}.0"


def _parse_kube_range(value: str) -> list[str]:
    """Parse the documented Kubernetes range, e.g. v1.33 - v1.35."""
    cleaned = value.replace("–", "-").replace("—", "-")
    match = re.search(
        r"v?(\d+\.\d+)\s*-\s*v?(\d+\.\d+)",
        cleaned,
    )
    if not match:
        return []
    start, end = match.groups()
    return expand_kube_versions(start, end)


def _parse_release_table(table) -> list[OrderedDict[str, object]]:
    values: dict[str, str] = {}
    for row in table.find_all("tr"):
        cells = [
            cell.get_text(" ", strip=True)
            for cell in row.find_all(["th", "td"])
        ]
        if len(cells) < 2:
            continue
        key = cells[0].rstrip(":").strip().lower()
        values[key] = cells[1].strip()

    kyverno_version = _normalize_version(values.get("supported release", ""))
    kube_versions = _parse_kube_range(
        values.get("kubernetes versions supported", "")
    )
    if not kyverno_version or not kube_versions:
        return []

    chart_version = get_chart_versions(app_name).get(kyverno_version)
    if not chart_version:
        print_error(
            f"No Kyverno Helm chart found for version {kyverno_version}"
        )
        return []

    return [
        OrderedDict(
            [
                ("version", kyverno_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
    ]


def scrape() -> None:
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    soup = BeautifulSoup(page_content, "html.parser")
    table = _find_release_table(soup)
    if not table:
        print_error("Kyverno supported-release table not found")
        return

    rows = _parse_release_table(table)
    if not rows:
        print_error("No compatibility rows parsed for Kyverno")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
