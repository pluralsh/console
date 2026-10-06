from __future__ import annotations

import re
from collections import OrderedDict
from typing import Callable, Optional

from bs4 import BeautifulSoup

app_name = "kyverno"

# The kyverno.io installation page no longer renders a compatibility table
# (kyverno/website#1953). The matrix data still lives in the site's constants,
# and the releases page summarizes the currently supported release.
matrix_url = (
    "https://raw.githubusercontent.com/kyverno/website/main/src/constants/version.ts"
)
releases_url = "https://kyverno.io/docs/installation/releases/"

# Upstream only keeps the most recent releases in its matrix. These releases
# were dropped before they were ever captured, so they are recorded from the
# kyverno/website history (src/constants/version.ts before 85848ed).
HISTORICAL_MATRIX = [
    ("1.17", "1.32", "1.35"),
]

_MATRIX_ENTRY_RE = re.compile(
    r"kyverno:\s*['\"]v?(\d+\.\d+)(?:\.x)?['\"]\s*,\s*"
    r"minKubernetes:\s*['\"]v?(\d+\.\d+)['\"]\s*,\s*"
    r"maxKubernetes:\s*['\"]v?(\d+\.\d+)['\"]"
)
_MINOR_RE = re.compile(r"v?(\d+\.\d+)")
_KUBE_RANGE_RE = re.compile(r"v?(\d+\.\d+)\s*[-–]\s*v?(\d+\.\d+)")


def _decode(payload: bytes | str) -> str:
    return payload.decode("utf-8") if isinstance(payload, bytes) else payload


def parse_matrix(source: str) -> list[tuple[str, str, str]]:
    """Parses (kyverno minor, min kube, max kube) entries from version.ts."""
    entries = _MATRIX_ENTRY_RE.findall(source)
    if not entries:
        raise ValueError("Kyverno compatibility matrix entries not found")
    return entries


def parse_releases_page(html: str) -> list[tuple[str, str, str]]:
    """Parses the supported release summary table on the releases page."""
    soup = BeautifulSoup(html, "html.parser")
    fields: dict[str, str] = {}
    for tr in soup.find_all("tr"):
        cols = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(cols) >= 2 and cols[0]:
            fields[cols[0].rstrip(":").strip().lower()] = cols[1]

    release = next((v for k, v in fields.items() if "release" in k and "end of life" not in k), None)
    kube = next((v for k, v in fields.items() if "kubernetes" in k), None)
    release_match = release and _MINOR_RE.search(release)
    kube_match = kube and _KUBE_RANGE_RE.search(kube)
    if not release_match or not kube_match:
        raise ValueError("Kyverno supported release table not found")
    return [(release_match.group(1), kube_match.group(1), kube_match.group(2))]


def _kube_range(start: str, end: str) -> list[str]:
    start_major, start_minor = (int(p) for p in start.split("."))
    end_major, end_minor = (int(p) for p in end.split("."))
    if start_major != end_major or start_minor > end_minor:
        raise ValueError(f"Invalid Kubernetes range {start} - {end}")
    return [f"{start_major}.{minor}" for minor in range(end_minor, start_minor - 1, -1)]


def build_rows(
    sources: list[list[tuple[str, str, str]]],
    chart_versions: dict[str, str],
) -> list[OrderedDict[str, object]]:
    """Merges matrix sources, earlier sources taking precedence per minor."""
    merged: dict[str, tuple[str, str]] = {}
    for entries in sources:
        for minor, kube_min, kube_max in entries:
            merged.setdefault(minor, (kube_min, kube_max))

    rows = []
    for minor, (kube_min, kube_max) in merged.items():
        version = f"{minor}.0"
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", _kube_range(kube_min, kube_max)),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_versions.get(version)),
                ]
            )
        )
    return rows


def _fetch_source(
    fetch: Callable[[str], Optional[bytes]],
    url: str,
    parse: Callable[[str], list[tuple[str, str, str]]],
    print_error: Callable[[str], None],
) -> list[tuple[str, str, str]]:
    payload = fetch(url)
    if not payload:
        print_error(f"Failed to fetch Kyverno compatibility source {url}")
        return []
    try:
        return parse(_decode(payload))
    except ValueError as err:
        print_error(f"{err} ({url})")
        return []


def scrape() -> None:
    from utils import fetch_page, get_chart_versions, print_error, update_compatibility_info

    matrix = _fetch_source(fetch_page, matrix_url, parse_matrix, print_error)
    releases = _fetch_source(fetch_page, releases_url, parse_releases_page, print_error)
    if not matrix and not releases:
        print_error("No Kyverno compatibility data found")
        return

    rows = build_rows([matrix, releases, HISTORICAL_MATRIX], get_chart_versions(app_name))
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
