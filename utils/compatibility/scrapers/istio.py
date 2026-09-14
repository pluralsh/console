"""Resolve supported Istio series against the official released istiod charts."""

from collections import OrderedDict
from copy import deepcopy
import re

from bs4 import BeautifulSoup
import requests
import yaml

from utils import print_error, read_yaml, reduce_versions, update_compatibility_info

app_name = "istio"
compatibility_url = "https://istio.io/latest/docs/releases/supported-releases/"
# Starting with 1.31, Istio no longer publishes releases to the GCP repository.
chart_repository_url = "https://blob.istio.io/istio-release/charts"
chart_index_url = f"{chart_repository_url}/index.yaml"
target_file = f"../../static/compatibilities/{app_name}.yaml"


def parse_support_table(content):
    soup = BeautifulSoup(content, "html.parser")
    required = ("Version", "Currently Supported", "Supported Kubernetes Versions")
    supported = {}
    for table in soup.find_all("table"):
        headers = [cell.get_text(" ", strip=True) for cell in table.find_all("th")
                   if cell.find_parent("table") is table]
        if not all(name in headers for name in required):
            continue
        if any(headers.count(name) != 1 for name in required):
            raise ValueError("Ambiguous Istio support table headers")
        version_index, status_index, kube_index = (headers.index(name) for name in required)
        for row in table.find_all("tr"):
            if row.find_parent("table") is not table:
                continue
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td", recursive=False)]
            if not cells:
                continue
            if len(cells) != len(headers):
                raise ValueError("Incomplete Istio support row")
            if cells[status_index].lower() != "yes":
                continue
            minor = cells[version_index]
            if not re.fullmatch(r"\d+\.\d+", minor):
                raise ValueError(f"Invalid supported Istio series: {minor!r}")
            kube = [value.strip() for value in cells[kube_index].split(",")]
            if not all(re.fullmatch(r"\d+\.\d+", value) for value in kube):
                raise ValueError(f"Invalid supported Kubernetes list for Istio {minor}")
            kube = sorted(set(kube), key=lambda value: tuple(map(int, value.split("."))), reverse=True)
            series = tuple(map(int, minor.split(".")))
            if series in supported and supported[series] != kube:
                raise ValueError(f"Conflicting support rows for Istio {minor}")
            supported[series] = kube
    if not supported:
        raise ValueError("No supported Istio series found")
    return supported


def _stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d+\.\d+\.\d+", value):
        return None
    return tuple(map(int, value.split(".")))


def parse_chart_index(content):
    index = yaml.safe_load(content)
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get("istiod") if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("No istiod charts found in the official index")
    versions = {}
    for entry in charts:
        if not isinstance(entry, dict):
            raise ValueError("Malformed istiod chart entry")
        app, chart = _stable_version(entry.get("appVersion")), _stable_version(entry.get("version"))
        if app is None or chart is None or entry.get("deprecated"):
            continue
        if app not in versions or chart > versions[app]:
            versions[app] = chart
    if not versions:
        raise ValueError("No stable istiod charts found")
    return versions


def build_rows(supported, charts, existing):
    recorded = {row["version"] for row in existing}
    rows = []
    for app, chart in charts.items():
        version = ".".join(map(str, app))
        if version in recorded or app[:2] not in supported:
            continue
        rows.append(OrderedDict([
            ("version", version), ("kube", supported[app[:2]]),
            ("chart_version", ".".join(map(str, chart))),
            ("requirements", []), ("incompatibilities", []),
        ]))
    # Resolve real chart releases before reducing minor boundaries and patches.
    # Preserve existing metadata as the live support table moves forward.
    retained = {row["version"] for row in reduce_versions(deepcopy(existing) + rows)}
    return [row for row in rows if row["version"] in retained]


def _fetch(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def scrape():
    existing = read_yaml(target_file)
    if not isinstance(existing, dict) or not isinstance(existing.get("versions"), list):
        print_error("Existing Istio compatibility data is missing or invalid")
        return
    try:
        supported = parse_support_table(_fetch(compatibility_url))
        charts = parse_chart_index(_fetch(chart_index_url))
        rows = build_rows(supported, charts, existing["versions"])
    except (requests.RequestException, ValueError, yaml.YAMLError) as error:
        print_error(f"Cannot update Istio compatibility: {error}")
        return
    if rows:
        update_compatibility_info(target_file, rows)
