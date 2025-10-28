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
)

app_name = "kyverno"
compatibility_url = "https://kyverno.io/docs/installation/"


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
            ]
        )
        rows.append(version_info)

    return rows


def scrape() -> None:
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    soup = BeautifulSoup(page_content, "html.parser")
    table = _find_compat_table(soup)
    if not table:
        print_error("Kyverno compatibility matrix table not found")
        return

    rows = _parse_rows(table)
    if not rows:
        print_error("No compatibility rows parsed for Kyverno")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name)
