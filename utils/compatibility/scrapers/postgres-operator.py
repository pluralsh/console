from __future__ import annotations

import re
from collections import OrderedDict

from bs4 import BeautifulSoup

app_name = "postgres-operator"
compatibility_url = "https://opensource.zalando.com/postgres-operator/"


def _expand_open_ended_kube_minimum(value: str, current_kube: str) -> list[str]:
    """Expand upstream's declared minimum (e.g. 1.27+) through current_kube."""
    minimum = re.fullmatch(r"v?1\.(\d+)\s*\+", value.strip())
    latest = re.fullmatch(r"1\.(\d+)", current_kube.strip())
    if not minimum or not latest:
        raise ValueError(f"Unsupported Kubernetes range: {value!r} / {current_kube!r}")

    min_minor = int(minimum.group(1))
    max_minor = int(latest.group(1))
    if min_minor > max_minor:
        raise ValueError(
            f"Documented Kubernetes minimum 1.{min_minor} exceeds current 1.{max_minor}"
        )
    return [f"1.{minor}" for minor in range(max_minor, min_minor - 1, -1)]


def _find_compatibility_table(soup: BeautifulSoup):
    for heading in soup.find_all(["h1", "h2", "h3", "h4"]):
        text = " ".join(heading.get_text(" ", strip=True).lower().split())
        if "supported postgres" in text and "k8s versions" in text:
            table = heading.find_next("table")
            if table:
                return table

    for table in soup.find_all("table"):
        headers = [
            " ".join(th.get_text(" ", strip=True).lower().split())
            for th in table.find_all("th")
        ]
        if "release" in headers and "k8s versions" in headers:
            return table
    return None


def parse_compatibility_table(
    html: str, chart_versions: dict[str, str], current_kube: str
) -> list[OrderedDict[str, object]]:
    soup = BeautifulSoup(html, "html.parser")
    table = _find_compatibility_table(soup)
    if table is None:
        raise ValueError("Zalando supported Postgres/K8s versions table not found")

    header_cells = [
        " ".join(th.get_text(" ", strip=True).lower().split())
        for th in table.find_all("th")
    ]
    try:
        release_idx = header_cells.index("release")
        kube_idx = header_cells.index("k8s versions")
    except ValueError as exc:
        raise ValueError("Unexpected Zalando compatibility table columns") from exc

    rows: list[OrderedDict[str, object]] = []
    seen: set[str] = set()
    tbody = table.find("tbody") or table
    for tr in tbody.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue
        if len(cells) <= max(release_idx, kube_idx):
            raise ValueError("Malformed Zalando compatibility table row")

        release_text = cells[release_idx].get_text(" ", strip=True)
        match = re.fullmatch(r"v?(\d+\.\d+\.\d+)", release_text)
        if not match:
            raise ValueError(f"Unsupported Zalando release value: {release_text!r}")
        version = match.group(1)
        if version in seen:
            raise ValueError(f"Duplicate Zalando release row: {version}")
        seen.add(version)

        kube_text = cells[kube_idx].get_text(" ", strip=True)
        kube_versions = _expand_open_ended_kube_minimum(kube_text, current_kube)

        chart_version = chart_versions.get(version)
        if not chart_version:
            # Only emit releases represented by the official Helm repository;
            # do not invent chart/application mappings.
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if not rows:
        raise ValueError("No Zalando releases matched official Helm chart versions")
    return rows


def scrape() -> None:
    from utils import (
        current_kube_version,
        fetch_page,
        get_chart_versions,
        update_compatibility_info,
    )

    page = fetch_page(compatibility_url)
    if not page:
        raise ValueError("Could not fetch Zalando Postgres Operator documentation")
    if isinstance(page, bytes):
        page = page.decode("utf-8")

    rows = parse_compatibility_table(
        page,
        get_chart_versions(app_name),
        current_kube_version(),
    )
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
