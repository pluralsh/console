"""Ceph CSI RBD compatibility from the upstream, release-specific test matrix."""

import re

import requests
import yaml
from packaging.version import Version

from utils import get_chart_images, update_compatibility_info


APP_NAME = "ceph-csi-rbd"
MATRIX_URL = "https://raw.githubusercontent.com/ceph/ceph-csi/devel/README.md"
CHART_REPOSITORY = "https://ceph.github.io/csi-charts"
CHART_INDEX_URL = f"{CHART_REPOSITORY}/index.yaml"
CATALOG_PATH = f"../../static/compatibilities/{APP_NAME}.yaml"


def fetch(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.text


def stable_version(value):
    match = re.fullmatch(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", str(value))
    return ".".join(match.groups()) if match else None


def parse_matrix(markdown):
    sections = re.findall(
        r"^## Known to work CO platforms\s*\n(.*?)(?=^## |\Z)",
        markdown,
        re.MULTILINE | re.DOTALL,
    )
    if len(sections) != 1:
        raise ValueError("Expected one Ceph CSI tested-platform section")
    rows = [
        [cell.strip() for cell in line.strip().strip("|").split("|")]
        for line in sections[0].splitlines() if line.strip().startswith("|")
    ]
    if len(rows) < 3 or rows[0] != [
        "Ceph CSI Version", "Container Orchestrator Name", "Version Tested"
    ]:
        raise ValueError("Ceph CSI tested-platform table has changed")
    if len(rows[1]) != 3 or not all(re.fullmatch(r":?-+:?", cell) for cell in rows[1]):
        raise ValueError("Invalid tested-platform table separator")

    matrix = {}
    for cells in rows[2:]:
        if len(cells) != 3:
            raise ValueError("Malformed tested-platform row")
        release, platform, versions = cells
        if release.startswith("devel "):
            continue
        version = stable_version(release)
        if not version or platform != "Kubernetes":
            raise ValueError(f"Unexpected tested-platform row: {cells}")
        kube = []
        for token in versions.split(","):
            match = re.fullmatch(r"v?(\d+)\.(\d+)", token.strip())
            if not match:
                raise ValueError(f"Expected explicit tested Kubernetes minors: {versions}")
            kube.append(".".join(match.groups()))
        if len(kube) != len(set(kube)):
            raise ValueError(f"Duplicate Kubernetes version for {version}")
        kube = sorted(kube, key=Version, reverse=True)
        if version in matrix and matrix[version] != kube:
            raise ValueError(f"Conflicting Ceph CSI rows for {version}")
        matrix[version] = kube
    if not matrix:
        raise ValueError("No stable Ceph CSI tested releases found")
    return matrix


def parse_chart_versions(content):
    index = yaml.safe_load(content)
    entries = index["entries"][APP_NAME]
    if not isinstance(entries, list) or not entries:
        raise ValueError("No Ceph CSI RBD charts found")
    versions = {}
    for entry in entries:
        app = stable_version(entry.get("appVersion"))
        chart = stable_version(entry.get("version"))
        if not app or not chart:
            continue
        if entry.get("name") != APP_NAME:
            raise ValueError("Unexpected chart identity in RBD index")
        if app not in versions or Version(chart) > Version(versions[app]):
            versions[app] = chart
    if not versions:
        raise ValueError("No stable Ceph CSI RBD charts found")
    return versions


def build_rows(matrix, charts):
    rows = []
    for version in sorted(matrix, key=Version, reverse=True):
        if version not in charts:
            continue
        rows.append({
            "version": version,
            "kube": matrix[version],
            "chart_version": charts[version],
            "images": [],
            "requirements": [],
            "incompatibilities": [],
        })
    if not rows:
        raise ValueError("No published RBD charts match the tested Ceph CSI releases")
    return rows


def scrape():
    matrix = parse_matrix(fetch(MATRIX_URL))
    charts = parse_chart_versions(fetch(CHART_INDEX_URL))
    rows = build_rows(matrix, charts)
    # Resolve every candidate before writing; a missing chart must not erase data.
    for row in rows:
        images = get_chart_images(CHART_REPOSITORY, APP_NAME, row["chart_version"])
        if not images:
            raise ValueError(f"Could not resolve RBD images for {row['version']}")
        row["images"] = images
    update_compatibility_info(CATALOG_PATH, rows)
