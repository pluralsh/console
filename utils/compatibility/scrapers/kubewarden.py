"""Compatibility for Kubewarden's current admission-controller Helm chart.

Use each release's Helm constraint and the versioned quick-start's additional
minimum for namespaced AdmissionPolicy. Neither source is a Kubernetes test
matrix. The deprecated kubewarden-controller chart is deliberately excluded.
"""

import re
from collections import OrderedDict

import requests
import semantic_version
import yaml
from bs4 import BeautifulSoup

from utils import current_kube_version, print_error, update_compatibility_info

APP_NAME = "kubewarden"
CHART_NAME = "admission-controller"
INDEX_URL = "https://charts.kubewarden.io/index.yaml"
DOCS_URL = "https://docs.kubewarden.io/admission-controller/{series}/en/quick-start.html"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _stable_version(value):
    if not isinstance(value, str):
        return None
    try:
        version = semantic_version.Version(value.strip().removeprefix("v"))
    except ValueError:
        return None
    return None if version.prerelease or version.build else version


def parse_kube_versions(spec, latest_kube):
    """Expand only the whole-minor minimum constraints published by this chart.

    Unknown syntax, patch-specific floors and future minima yield no rows. This
    intentionally does not guess the meaning of an arbitrary Helm expression.
    """
    if not isinstance(spec, str) or not isinstance(latest_kube, str):
        return []
    floor = re.fullmatch(r">=\s*1\.(0|[1-9]\d*)\.0(?:-0)?", spec.strip())
    ceiling = re.fullmatch(r"1\.(0|[1-9]\d*)", latest_kube.strip())
    if not floor or not ceiling:
        return []
    first, last = int(floor[1]), int(ceiling[1])
    return [f"1.{minor}" for minor in range(last, first - 1, -1)]


def extract_versions(index, latest_kube):
    """Select the newest eligible stable chart for each stable application."""
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        return []
    entries = index["entries"].get(CHART_NAME)
    if not isinstance(entries, list):
        return []
    selected = {}
    for chart in entries:
        if not isinstance(chart, dict) or chart.get("deprecated", False):
            continue
        if chart.get("name", CHART_NAME) != CHART_NAME:
            continue
        app_version = _stable_version(chart.get("appVersion"))
        chart_version = _stable_version(chart.get("version"))
        kube = parse_kube_versions(chart.get("kubeVersion"), latest_kube)
        if app_version is None or chart_version is None or not kube:
            continue
        previous = selected.get(app_version)
        if previous and chart_version <= previous[0]:
            continue
        selected[app_version] = (chart_version, kube)

    return [
        OrderedDict([
            ("version", str(app_version)),
            ("kube", selected[app_version][1]),
            ("requirements", []),
            ("incompatibilities", []),
            ("chart_version", str(selected[app_version][0])),
        ])
        for app_version in sorted(selected, reverse=True)
    ]


def parse_policy_minimum(content):
    """Read the explicit AdmissionPolicy requirement, not another page version."""
    if not isinstance(content, (str, bytes)):
        return None
    text = BeautifulSoup(content, "html.parser").get_text(" ", strip=True)
    text = " ".join(text.split())
    requirements = re.finditer(r"\bAdmissionPolicy requires Kubernetes ", text)
    minima = set()
    for requirement in requirements:
        match = re.match(r"(1\.(?:0|[1-9]\d*))\.0 or greater\b", text[requirement.end():])
        if match is None:
            return None
        minima.add(match[1])
    return next(iter(minima)) if len(minima) == 1 else None


def apply_policy_minimum(rows, minimum):
    if not isinstance(minimum, str) or not re.fullmatch(r"1\.(0|[1-9]\d*)", minimum):
        return []
    floor = int(minimum.split(".")[1])
    result = []
    for row in rows:
        kube = [version for version in row["kube"] if int(version.split(".")[1]) >= floor]
        if kube:
            entry = OrderedDict(row)
            entry["kube"] = kube
            result.append(entry)
    return result


def _fetch(url):
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except requests.RequestException as exc:
        print_error(f"Failed to fetch Kubewarden source {url}: {exc}")
        return None


def scrape():
    content = _fetch(INDEX_URL)
    if content is None:
        return
    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Invalid Kubewarden Helm index: {exc}")
        return
    rows = extract_versions(index, current_kube_version())
    if not rows:
        print_error("No stable Kubewarden admission-controller compatibility rows found.")
        return

    by_series = {}
    for row in rows:
        series = ".".join(row["version"].split(".")[:2])
        by_series.setdefault(series, []).append(row)

    versions = []
    for series, series_rows in by_series.items():
        page = _fetch(DOCS_URL.format(series=series))
        minimum = parse_policy_minimum(page)
        if minimum is None:
            print_error(f"No unambiguous AdmissionPolicy Kubernetes minimum for {series}; skipping.")
            continue
        versions.extend(apply_policy_minimum(series_rows, minimum))

    if not versions:
        print_error("No Kubewarden versions with both Helm and feature requirements verified.")
        return
    update_compatibility_info(TARGET_FILE, versions)
