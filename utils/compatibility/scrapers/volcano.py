import re

import requests
import yaml
from packaging.version import Version

from utils import update_compatibility_info


app_name = "volcano"
MATRIX_URL = "https://raw.githubusercontent.com/volcano-sh/volcano/master/README.md"
CHART_INDEX_URL = "https://volcano-sh.github.io/helm-charts/index.yaml"


def fetch(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def parse_matrix(markdown):
    sections = re.split(r"^## Kubernetes compatibility\s*$", markdown, flags=re.MULTILINE)
    if len(sections) != 2:
        raise ValueError("Expected exactly one Volcano Kubernetes compatibility section")
    section = re.split(r"^## ", sections[1], maxsplit=1, flags=re.MULTILINE)[0]
    rows = [line.strip().strip("|").split("|") for line in section.splitlines()
            if line.strip().startswith("|")]
    rows = [[cell.strip() for cell in row] for row in rows]
    if len(rows) < 3:
        raise ValueError("Missing Volcano compatibility table")

    headers = rows[0][1:]
    if not headers or any(not re.fullmatch(r"Kubernetes \d+\.\d+", cell) for cell in headers):
        raise ValueError("Unexpected Kubernetes version headers")
    kube_versions = [cell.split()[1] for cell in headers]
    if len(kube_versions) != len(set(kube_versions)):
        raise ValueError("Duplicate Kubernetes version headers")
    if len(rows[1]) != len(rows[0]) or any(not re.fullmatch(r":?-+:?", cell) for cell in rows[1]):
        raise ValueError("Invalid compatibility table separator")

    matrix = {}
    for row in rows[2:]:
        if len(row) != len(rows[0]) or any(cell not in {"✓", "+", "-"} for cell in row[1:]):
            raise ValueError("Unexpected compatibility table cells")
        if row[0] == "Volcano HEAD (master)":
            continue
        match = re.fullmatch(r"Volcano v(\d+\.\d+)", row[0])
        if not match or match[1] in matrix:
            raise ValueError("Unexpected or duplicate Volcano release row")
        # '+' and '-' both describe API/feature differences, not exact compatibility.
        supported = [version for version, cell in zip(kube_versions, row[1:]) if cell == "✓"]
        if not supported:
            raise ValueError(f"No exact Kubernetes compatibility for Volcano {match[1]}")
        matrix[match[1]] = sorted(supported, key=Version, reverse=True)
    if not matrix:
        raise ValueError("No released Volcano versions in compatibility table")
    return matrix


def parse_chart_versions(index):
    document = yaml.safe_load(index)
    if not isinstance(document, dict) or not isinstance(document.get("entries"), dict):
        raise ValueError("Invalid Volcano Helm index")
    entries = document["entries"].get(app_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError("No Volcano Helm charts")
    versions = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Volcano chart entry")
        app = str(entry.get("appVersion", "")).removeprefix("v")
        chart = str(entry.get("version", ""))
        # Older charts used appVersion 0.1; previews and missing versions are not releases.
        if not re.fullmatch(r"\d+\.\d+\.\d+", app) or not re.fullmatch(r"v?\d+\.\d+\.\d+", chart):
            continue
        if app not in versions or Version(chart) > Version(versions[app]):
            versions[app] = chart
    if not versions:
        raise ValueError("No stable Volcano Helm app versions")
    return versions


def build_versions(matrix, chart_versions):
    versions = []
    for app in sorted(chart_versions, key=Version, reverse=True):
        minor = ".".join(app.split(".")[:2])
        if minor not in matrix:
            continue
        versions.append({
            "version": app,
            "kube": matrix[minor],
            "chart_version": chart_versions[app],
            "requirements": [],
            "incompatibilities": [],
        })
    if not versions:
        raise ValueError("No published Volcano releases match the compatibility matrix")
    return versions


def scrape():
    matrix = parse_matrix(fetch(MATRIX_URL).decode("utf-8"))
    chart_versions = parse_chart_versions(fetch(CHART_INDEX_URL))
    versions = build_versions(matrix, chart_versions)
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
