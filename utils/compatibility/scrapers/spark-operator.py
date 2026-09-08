"""Kubeflow Spark Operator compatibility from the upstream version matrix.

Only modern semver operator releases are supported. Legacy v1beta2 tags encode
both operator and Spark versions and cannot use the standard release URL.
"""

import re
from collections import OrderedDict

from packaging.version import Version

README_URL = "https://raw.githubusercontent.com/kubeflow/spark-operator/master/README.md"


def parse_matrix(markdown):
    """Read explicit modern operator families, never the Base Spark column."""
    section = re.search(r"^## Version Matrix\s*$(.*?)(?=^## |\Z)", markdown, re.M | re.S)
    if not section:
        raise ValueError("Spark Operator Version Matrix section not found")
    rows = [
        [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        for line in section.group(1).splitlines()
        if line.strip().startswith("|")
    ]
    if not rows or rows[0] != [
        "Operator Version", "API Version", "Kubernetes Version", "Base Spark Version"
    ]:
        raise ValueError("Unexpected Spark Operator matrix columns")
    families = {}
    for cells in rows[2:]:
        if len(cells) != 4:
            raise ValueError("Malformed Spark Operator matrix row")
        operator, _, kube, _ = cells
        if operator.startswith("v1beta2-"):
            continue
        family = re.fullmatch(r"v(\d+)\.(\d+)\.x", operator)
        minimum = re.fullmatch(r"1\.(\d+)\+", kube)
        if not family or not minimum:
            raise ValueError(f"Unsupported matrix row: {operator}: {kube}")
        key = tuple(map(int, family.groups()))
        if key in families:
            raise ValueError(f"Duplicate operator family: {operator}")
        families[key] = int(minimum.group(1))
    if not families:
        raise ValueError("No modern operator families found")
    return families


def build_rows(markdown, chart_versions, current_kube):
    families = parse_matrix(markdown)
    latest = re.fullmatch(r"1\.(\d+)", current_kube)
    if not latest:
        raise ValueError(f"Unsupported Kubernetes upper bound: {current_kube}")
    latest_minor = int(latest.group(1))
    rows = []
    for app, chart in chart_versions.items():
        # Chart appVersion is the operator version, not its bundled Spark version.
        if not re.fullmatch(r"\d+\.\d+\.\d+", app):
            continue
        version = Version(app)
        minimum = families.get((version.major, version.minor))
        if minimum is None:
            continue
        if minimum > latest_minor:
            raise ValueError("Kubernetes upper bound precedes documented minimum")
        rows.append(OrderedDict([
            ("version", app),
            ("kube", [f"1.{minor}" for minor in range(latest_minor, minimum - 1, -1)]),
            ("chart_version", chart),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    if not rows:
        raise ValueError("No chart versions matched the documented operator families")
    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    from utils import fetch_page, get_chart_versions, current_kube_version, update_compatibility_info

    page = fetch_page(README_URL)
    if not page:
        raise ValueError("Could not fetch Spark Operator version matrix")
    rows = build_rows(
        page.decode("utf-8"), get_chart_versions("spark-operator"), current_kube_version()
    )
    update_compatibility_info("../../static/compatibilities/spark-operator.yaml", rows)
