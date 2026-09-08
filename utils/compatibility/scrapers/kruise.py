"""OpenKruise's explicit API-match matrix, joined to stable Helm releases.

Source: https://openkruise.io/docs/installation
Only checkmarks are mapped to `kube`. The + and - cells describe API overlap,
not exact matches; ? is untested. Never interpolate missing Kubernetes minors.
This conservative mapping is awaiting maintainer agreement in console#4169.
"""

import re

from bs4 import BeautifulSoup
import yaml

app_name = "kruise"
compatibility_url = "https://openkruise.io/docs/installation"
chart_index_url = "https://openkruise.github.io/charts/index.yaml"


def _stable_version(value):
    if not isinstance(value, str):
        return None
    match = re.fullmatch(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", value)
    return tuple(map(int, match.groups())) if match else None


def parse_matrix(content):
    """Return minor-version tuples mapped to explicit Kubernetes API matches.

    Fail closed when the table shape or vocabulary changes, so a scheduled
    scrape cannot replace stored data with guessed or misaligned columns.
    """
    soup = BeautifulSoup(content, "html.parser")
    candidates = []
    for table in soup.find_all("table"):
        first_row = table.find("tr")
        if first_row:
            cells = first_row.find_all(["td", "th"])
            if cells and cells[0].get_text(" ", strip=True).lower() == "kruise version":
                candidates.append(table)
    if len(candidates) != 1:
        raise ValueError("Expected exactly one Kruise compatibility matrix")

    rows = candidates[0].find_all("tr")
    headers = [cell.get_text(" ", strip=True) for cell in rows[0].find_all(["th", "td"])]
    kube = headers[1:]
    if not kube or any(not re.fullmatch(r"1\.\d+", version) for version in kube):
        raise ValueError("Invalid Kubernetes column labels")
    if len(set(kube)) != len(kube):
        raise ValueError("Duplicate Kubernetes columns")

    matrix = {}
    for row in rows[1:]:
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
        if len(cells) != len(headers):
            raise ValueError("Kruise matrix row width changed")
        match = re.fullmatch(r"(\d+)\.(\d+)\.x", cells[0])
        if not match:
            raise ValueError("Invalid Kruise minor-version label")
        minor = tuple(map(int, match.groups()))
        if minor in matrix:
            raise ValueError("Duplicate Kruise minor-version row")
        if any(symbol not in {"✓", "+", "-", "?"} for symbol in cells[1:]):
            raise ValueError("Unknown Kruise compatibility symbol")
        matrix[minor] = [version for version, symbol in zip(kube, cells[1:]) if symbol == "✓"]
    if not matrix or not any(matrix.values()):
        raise ValueError("No explicit Kruise API matches found")
    return matrix


def build_rows(page_content, index_content):
    matrix = parse_matrix(page_content)
    index = yaml.safe_load(index_content)
    chart_groups = index.get("entries") if isinstance(index, dict) else None
    entries = chart_groups.get(app_name) if isinstance(chart_groups, dict) else None
    if not isinstance(entries, list):
        raise ValueError("Missing Kruise chart entries")

    charts = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Kruise chart entry")
        version = _stable_version(entry.get("appVersion"))
        chart = _stable_version(entry.get("version"))
        if version is None or chart is None or not matrix.get(version[:2]):
            continue
        # Do not rely on Helm index ordering or confuse app and chart versions.
        if version not in charts or chart > charts[version][0]:
            charts[version] = (chart, entry["version"])
    if not charts:
        raise ValueError("No stable charts match documented Kruise versions")

    return [
        {
            "version": ".".join(map(str, version)),
            "kube": sorted(matrix[version[:2]], key=lambda value: tuple(map(int, value.split("."))), reverse=True),
            "chart_version": charts[version][1],
            "requirements": [],
            "incompatibilities": [],
        }
        for version in sorted(charts, reverse=True)
    ]


def scrape():
    # Keep pure parsers importable without loading the network/AI/Helm helpers.
    from utils import fetch_page, print_error, update_compatibility_info

    page = fetch_page(compatibility_url)
    index = fetch_page(chart_index_url)
    if not page or not index:
        print_error("Failed to fetch Kruise compatibility sources; leaving data unchanged")
        return
    try:
        rows = build_rows(page, index)
    except (ValueError, yaml.YAMLError) as error:
        print_error(f"Cannot parse Kruise compatibility sources: {error}")
        return
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
