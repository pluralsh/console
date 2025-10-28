from __future__ import annotations

import re
from collections import OrderedDict
from typing import Optional

from bs4 import BeautifulSoup
from utils import (
    expand_kube_versions,
    fetch_page,
    get_latest_github_release,
    print_error,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
)

app_name = "keda"


def _docs_url() -> str:
    # Prefer the canonical latest docs URL, which redirects to the current minor
    latest = "https://keda.sh/docs/latest/operate/cluster/"
    content = fetch_page(latest)
    if content:
        return latest

    # Fallback: derive version from GitHub latest release tag (e.g., v2.18.0 -> 2.18)
    try:
        tag = get_latest_github_release("kedacore", "keda") or ""
        m = re.search(r"v?(\d+)\.(\d+)", tag)
        if m:
            version_path = f"{m.group(1)}.{m.group(2)}"
            return f"https://keda.sh/docs/{version_path}/operate/cluster/"
    except Exception:
        pass

    # Last resort: fixed page (may become stale)
    return "https://keda.sh/docs/2.18/operate/cluster/"


def _normalize_keda_version(value: str) -> Optional[str]:
    # Accept forms like v2.18, 2.18, v2.7, 2.7
    m = re.search(r"v?(\d+)\.(\d+)", value.strip())
    if not m:
        return None
    major, minor = m.groups()
    return f"{major}.{minor}.0"


def _parse_kube_range(value: str) -> list[str]:
    cleaned = value.replace("\u2013", "-").replace("\u2014", "-").strip()
    if not cleaned or cleaned.upper() == "TBD":
        return []
    # Expect formats like: v1.31 - v1.33
    m = re.match(r"v?(\d+\.\d+)\s*-\s*v?(\d+\.\d+)", cleaned)
    if m:
        start, end = m.groups()
        return expand_kube_versions(start, end)
    # Single version or comma list fallback
    parts = [p.strip().lstrip("v") for p in cleaned.split(",")]
    return [p for p in parts if p]


def _parse_table(soup: BeautifulSoup) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []

    # The section uses an h3 with id="kubernetes-compatibility"
    header = soup.find(["h3", "h2"], id="kubernetes-compatibility")
    if not header:
        # fallback: scan by text
        for h in soup.find_all(["h2", "h3"]):
            if "kubernetes compatibility" in h.get_text(strip=True).lower():
                header = h
                break
    if not header:
        return rows

    table = header.find_next("table")
    if not table:
        return rows

    tbody = table.find("tbody") or table
    for tr in tbody.find_all("tr"):
        cols = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
        if len(cols) < 2:
            continue
        keda_col, kube_col = cols[:2]

        keda_version = _normalize_keda_version(keda_col)
        kube_versions = _parse_kube_range(kube_col)

        # Skip rows without a concrete kube range (e.g., TBD)
        if not keda_version or not kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", keda_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape() -> None:
    url = _docs_url()
    page_content = fetch_page(url)
    if not page_content:
        print_error("Failed to fetch KEDA documentation page")
        return

    soup = BeautifulSoup(page_content, "html.parser")
    rows = _parse_table(soup)
    if not rows:
        print_error("No compatibility information found for KEDA")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, rows)

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name)
