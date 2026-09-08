from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup
from packaging.version import Version

from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "consul"
COMPATIBILITY_URL = (
    "https://developer.hashicorp.com/consul/docs/upgrade/k8s/compatibility"
)
HELM_INDEX_URL = "https://helm.releases.hashicorp.com/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
FAMILY_RE = re.compile(r"(\d+)\.(\d+)\.x")
KUBE_RANGE_RE = re.compile(
    r"(\d+)\.(\d+)(?:\.x)?\s*(?:→|->|-|–|—)\s*(\d+)\.(\d+)(?:\.x)?"
)


def _cell_lines(cell) -> list[str]:
    text = cell.get_text("\n", strip=True)
    return [line.strip() for line in text.split("\n") if line.strip()]


def _families(value: str) -> list[str]:
    return [f"{major}.{minor}" for major, minor in FAMILY_RE.findall(value)]


def parse_kube_versions(value: str) -> list[str]:
    if not value:
        return []
    match = KUBE_RANGE_RE.search(value)
    if not match:
        return []
    start = f"{match.group(1)}.{match.group(2)}"
    end = f"{match.group(3)}.{match.group(4)}"
    return expand_kube_versions(start, end)


def find_standard_releases_table(soup: BeautifulSoup):
    heading = soup.find(
        lambda tag: tag.name in ("h2", "h3", "h4")
        and tag.get_text(" ", strip=True) == "Standard releases"
    )
    if heading:
        table = heading.find_next("table")
        if table:
            return table

    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        joined = " ".join(headers)
        if "Compatible Kubernetes versions" not in joined or "consul-k8s" not in joined:
            continue
        body_rows = table.find_all("tr")[1:]
        if not body_rows:
            continue
        first_cell = body_rows[0].find("td")
        if first_cell and "ent" in first_cell.get_text(" ", strip=True).lower():
            continue
        return table
    return None


def parse_standard_matrix_pairings(html: str) -> list[dict[str, object]]:
    soup = BeautifulSoup(html, "html.parser")
    table = find_standard_releases_table(soup)
    if table is None:
        return []

    pairings: list[dict[str, object]] = []
    for row in table.find_all("tr")[1:]:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue

        consul_text = cells[0].get_text(" ", strip=True)
        if "ent" in consul_text.lower():
            continue

        consul_families = _families(consul_text)
        if not consul_families:
            continue
        consul_family = consul_families[0]

        chart_families = _families(" ".join(_cell_lines(cells[1])))
        kube_lists = [
            kube
            for line in _cell_lines(cells[2])
            for kube in [parse_kube_versions(line)]
            if kube
        ]
        if not kube_lists:
            kube_lists = [
                parse_kube_versions(match.group(0))
                for match in KUBE_RANGE_RE.finditer(cells[2].get_text(" ", strip=True))
            ]
            kube_lists = [kube for kube in kube_lists if kube]
        if not chart_families or not kube_lists:
            continue

        for chart_family, kube in zip(chart_families, kube_lists):
            pairings.append(
                {
                    "consul_family": consul_family,
                    "chart_family": chart_family,
                    "kube": kube,
                }
            )
    return pairings


def select_catalog_pairings(pairings: list[dict[str, object]]) -> list[dict[str, object]]:
    # merge_versions keys catalog rows on Consul appVersion. Two consul-k8s
    # families for the same Consul series (1.21.x → 1.8.x and 1.7.x) collapse,
    # so keep the newest documented chart family per Consul series.
    selected: dict[str, dict[str, object]] = {}
    for pairing in pairings:
        consul_family = str(pairing["consul_family"])
        current = selected.get(consul_family)
        if current is None or Version(str(pairing["chart_family"])) > Version(
            str(current["chart_family"])
        ):
            selected[consul_family] = pairing
    return list(selected.values())


def parse_standard_matrix(html: str) -> list[dict[str, object]]:
    return select_catalog_pairings(parse_standard_matrix_pairings(html))


def latest_stable_charts(entries: list[dict]) -> dict[tuple[str, str], dict[str, str]]:
    latest: dict[tuple[str, str], dict[str, object]] = {}
    for entry in entries:
        raw_chart = str(entry.get("version") or "").lstrip("v")
        raw_app = str(entry.get("appVersion") or "").lstrip("v")
        if not raw_chart or not raw_app or "-" in raw_chart or "-" in raw_app:
            continue

        chart_semver = validate_semver(raw_chart)
        app_semver = validate_semver(raw_app)
        if not chart_semver or not app_semver:
            continue

        key = (
            f"{chart_semver.major}.{chart_semver.minor}",
            f"{app_semver.major}.{app_semver.minor}",
        )
        current = latest.get(key)
        if current is None or chart_semver > current["_chart"]:
            latest[key] = {
                "version": str(app_semver),
                "chart_version": str(chart_semver),
                "_chart": chart_semver,
            }

    return {
        key: {"version": item["version"], "chart_version": item["chart_version"]}
        for key, item in latest.items()
    }


def build_versions(
    matrix_rows: list[dict[str, object]],
    charts: dict[tuple[str, str], dict[str, str]],
) -> list[OrderedDict]:
    versions: list[OrderedDict] = []
    for row in matrix_rows:
        chart = charts.get((str(row["chart_family"]), str(row["consul_family"])))
        kube = row.get("kube") or []
        if not chart or not kube:
            continue
        versions.append(
            OrderedDict(
                [
                    ("version", chart["version"]),
                    ("kube", list(kube)),
                    ("chart_version", chart["chart_version"]),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return versions


def scrape() -> None:
    page = fetch_page(COMPATIBILITY_URL)
    if not page:
        print_error("Failed to fetch Consul Kubernetes compatibility docs.")
        return

    html = (
        page.decode("utf-8", errors="replace")
        if isinstance(page, (bytes, bytearray))
        else str(page)
    )
    matrix_rows = parse_standard_matrix(html)
    if not matrix_rows:
        print_error("Consul standard-release compatibility table not found.")
        return

    index_content = fetch_page(HELM_INDEX_URL)
    if not index_content:
        print_error("Failed to fetch HashiCorp Helm index.")
        return

    try:
        index = yaml.safe_load(index_content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse HashiCorp Helm index: {exc}")
        return

    entries = (index or {}).get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No consul chart entries found in HashiCorp Helm index.")
        return

    versions = build_versions(matrix_rows, latest_stable_charts(entries))
    if not versions:
        print_error("No Consul compatibility rows could be joined to Helm charts.")
        return

    update_compatibility_info(TARGET_FILE, versions)
