from __future__ import annotations

import re
from collections import OrderedDict
from typing import Optional

from bs4 import BeautifulSoup
from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
    get_chart_versions,
)

app_name = "kyverno"
compatibility_url = "https://kyverno.io/docs/installation/releases/"


def _parse_patch_support(soup: BeautifulSoup) -> list[OrderedDict[str, object]]:
    """Read the release page's labelled support schedule, not Helm constraints."""
    for table in soup.find_all("table"):
        fields = {}
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            if len(cells) == 2:
                label = cells[0].get_text(" ", strip=True).rstrip(":").lower()
                fields[label] = cells[1].get_text(" ", strip=True)

        release = re.fullmatch(
            r"v?(\d+)\.(\d+)(?:\s+\(released:\s*[^)]+\))?",
            fields.get("supported release", ""),
        )
        bounds = re.fullmatch(
            r"v?(\d+)\.(\d+)\s*[-–—]\s*v?(\d+)\.(\d+)",
            fields.get("kubernetes versions supported", ""),
        )
        if not release or not bounds:
            continue
        start_major, start_minor, end_major, end_minor = map(int, bounds.groups())
        if start_major != end_major or start_minor > end_minor:
            continue

        version = f"{release[1]}.{release[2]}.0"
        chart_version = get_chart_versions(app_name).get(version)
        if not chart_version:
            continue
        return [OrderedDict([
            ("version", version),
            ("kube", [f"{start_major}.{minor}" for minor in range(start_minor, end_minor + 1)]),
            ("requirements", []),
            ("incompatibilities", []),
            ("chart_version", chart_version),
        ])]
    return []


def _find_compat_table(soup: BeautifulSoup):
    # Look for the Compatibility Matrix section and grab the following table
    h2 = soup.find("h2", id="compatibility-matrix")
    if not h2:
        # Fallback: search by heading text in case id changes
        for candidate in soup.find_all("h2"):
            if candidate.get_text(strip=True).lower() == "compatibility matrix":
                h2 = candidate
                break
    if not h2:
        return None
    return h2.find_next("table")


def _normalize_version(ver: str) -> Optional[str]:
    # Accept formats like "1.13.x", "v1.13.x", or "1.13"
    m = re.search(r"v?(\d+)\.(\d+)", ver.strip())
    if not m:
        return None
    major, minor = m.groups()
    return f"{major}.{minor}.0"


def _parse_rows(table) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []
    tbody = table.find("tbody") or table
    chart_versions = get_chart_versions(app_name)
    for tr in tbody.find_all("tr"):
        cols = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
        if len(cols) < 3:
            continue
        kyverno_ver_raw, kube_min_raw, kube_max_raw = cols[:3]

        kyverno_version = _normalize_version(kyverno_ver_raw)
        if not kyverno_version:
            continue

        kube_min = kube_min_raw.lstrip("v").strip()
        kube_max = kube_max_raw.lstrip("v").strip()
        if not kube_min or not kube_max:
            continue

        kube_versions = expand_kube_versions(kube_min, kube_max)
        if not kube_versions:
            continue

        version_info = OrderedDict(
            [
                ("version", kyverno_version),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
                ("chart_version", chart_versions.get(kyverno_version)),
            ]
        )
        rows.append(version_info)

    return rows


def scrape() -> None:
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    soup = BeautifulSoup(page_content, "html.parser")
    rows = _parse_patch_support(soup)
    if not rows:
        table = _find_compat_table(soup)
        rows = _parse_rows(table) if table else []
    if not rows:
        print_error("No compatibility rows parsed for Kyverno")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)
