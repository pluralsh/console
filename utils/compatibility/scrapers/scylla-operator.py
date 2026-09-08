from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup
from packaging.version import InvalidVersion, Version

from utils import fetch_page, update_compatibility_info

app_name = "scylla-operator"
releases_url = "https://operator.docs.scylladb.com/v1.22/reference/releases.html"
release_url_template = "https://operator.docs.scylladb.com/v{series}/reference/releases.html"
chart_index_url = "https://scylla-operator-charts.storage.googleapis.com/stable/index.yaml"
chart_name = "scylla-operator"


def _decode(content: bytes | str, source: str) -> str:
    if isinstance(content, str):
        return content
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"Could not decode {source} as UTF-8") from exc


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_supported_series(content: bytes | str) -> list[str]:
    soup = BeautifulSoup(_decode(content, "ScyllaDB Operator releases page"), "html.parser")
    marker = soup.find(lambda tag: tag.name in {"h2", "h3"} and "Supported releases" in tag.get_text(" ", strip=True))
    if marker is None:
        raise ValueError("ScyllaDB Operator supported releases section not found")
    table = marker.find_next("table")
    if table is None:
        raise ValueError("ScyllaDB Operator supported releases table not found")
    series: list[str] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        value = _normalize(cells[0].get_text(" ", strip=True))
        if re.fullmatch(r"\d+\.\d+", value):
            series.append(value)
        if len(series) == 2:
            break
    if len(series) != 2:
        raise ValueError("Expected the two currently supported ScyllaDB Operator releases")
    return series


def parse_chart_versions(content: bytes | str) -> dict[str, str]:
    try:
        parsed = yaml.safe_load(_decode(content, "ScyllaDB Operator Helm index"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse ScyllaDB Operator Helm index") from exc
    entries = parsed.get("entries", {}).get(chart_name) if isinstance(parsed, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"ScyllaDB Operator Helm index has no {chart_name!r} entries")
    versions: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        raw = str(entry.get("appVersion") or entry.get("version") or "").lstrip("v")
        chart = str(entry.get("version") or "").lstrip("v")
        try:
            version = Version(raw)
            chart_version = Version(chart)
        except InvalidVersion:
            continue
        if version.is_prerelease or version.is_devrelease or chart_version.is_prerelease:
            continue
        series = f"{version.major}.{version.minor}"
        current = versions.get(series)
        if current is None or Version(raw) > Version(current.split("|")[0]):
            versions[series] = f"{raw}|{chart}"
    if not versions:
        raise ValueError("ScyllaDB Operator Helm index contains no stable releases")
    return versions


def _component_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [_normalize(x.get_text(" ", strip=True)).lower() for x in table.find_all("th")]
        if headers[:2] == ["component", "supported versions"]:
            return table
    raise ValueError("ScyllaDB Operator support matrix not found")


def parse_kubernetes_versions(content: bytes | str) -> list[str]:
    soup = BeautifulSoup(_decode(content, "ScyllaDB Operator release support page"), "html.parser")
    table = _component_table(soup)
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        if _normalize(cells[0].get_text(" ", strip=True)).lower() != "kubernetes":
            continue
        value = _normalize(cells[1].get_text(" ", strip=True))
        versions = re.findall(r"(?<!\d)(1\.\d+)(?!\d)", value)
        if not versions:
            raise ValueError(f"No Kubernetes versions found in support matrix value {value!r}")
        if len(versions) == 2:
            low, high = (int(item.split(".")[1]) for item in versions)
            if low > high:
                low, high = high, low
            return [f"1.{minor}" for minor in range(high, low - 1, -1)]
        return sorted(set(versions), key=lambda item: int(item.split(".")[1]), reverse=True)
    raise ValueError("Kubernetes row not found in ScyllaDB Operator support matrix")


def scrape() -> None:
    index = fetch_page(chart_index_url)
    if not index:
        raise ValueError("Could not fetch ScyllaDB Operator Helm index")
    chart_versions = parse_chart_versions(index)

    releases_page = fetch_page(releases_url)
    if not releases_page:
        raise ValueError("Could not fetch ScyllaDB Operator releases page")
    supported = parse_supported_series(releases_page)

    rows: list[OrderedDict[str, object]] = []
    for series in supported:
        chart_info = chart_versions.get(series)
        if not chart_info:
            raise ValueError(f"No stable ScyllaDB Operator Helm chart for supported release {series}")
        version, chart_version = chart_info.split("|", 1)
        page = fetch_page(release_url_template.format(series=series))
        if not page:
            raise ValueError(f"Could not fetch support matrix for ScyllaDB Operator {series}")
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", parse_kubernetes_versions(page)),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_version),
                ]
            )
        )

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
