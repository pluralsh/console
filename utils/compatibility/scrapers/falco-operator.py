"""Read each charted operator release's own Kubernetes prerequisite."""

import re
from collections import OrderedDict

from packaging.version import Version

from utils import (
    current_kube_version,
    fetch_page,
    get_chart_versions,
    update_compatibility_info,
)


APP_NAME = "falco-operator"
INSTALLATION_URL = (
    "https://raw.githubusercontent.com/falcosecurity/falco-operator/"
    "v{version}/docs/installation.md"
)


def parse_minimum_kube_version(content):
    """Do not infer historical requirements from the unversioned docs."""
    if isinstance(content, bytes):
        content = content.decode("utf-8")
    if not isinstance(content, str):
        raise ValueError("Missing Falco Operator installation documentation")

    sections = re.findall(
        r"^## Prerequisites\s*\n(.*?)(?=^## |\Z)",
        content,
        flags=re.MULTILINE | re.DOTALL,
    )
    if len(sections) != 1:
        raise ValueError("Expected one Falco Operator prerequisites section")
    versions = re.findall(
        r"^- \*\*Kubernetes (\d+\.\d+)\+\*\*", sections[0], flags=re.MULTILINE
    )
    if len(versions) != 1:
        raise ValueError("Expected one explicit Kubernetes minimum version")
    return versions[0]


def kube_versions_from_minimum(minimum, latest):
    """Expand the documented lower bound only to the catalog's current minor."""
    if not isinstance(latest, str) or not re.fullmatch(r"\d+\.\d+", latest):
        raise ValueError("Missing or invalid catalog Kubernetes version")
    start_major, start_minor = map(int, minimum.split("."))
    end_major, end_minor = map(int, latest.split("."))
    if start_major != end_major:
        raise ValueError("Cannot extrapolate requirements across Kubernetes majors")
    return [f"{start_major}.{minor}" for minor in range(start_minor, end_minor + 1)]


def extract_table_data(chart_versions, latest_kube, fetch_document):
    rows = []
    stable_versions = [
        (app_version, chart_version)
        for app_version, chart_version in chart_versions.items()
        if isinstance(app_version, str)
        and isinstance(chart_version, str)
        and re.fullmatch(r"\d+\.\d+\.\d+", app_version)
        and re.fullmatch(r"\d+\.\d+\.\d+", chart_version)
    ]
    for app_version, chart_version in sorted(
        stable_versions, key=lambda pair: Version(pair[0]), reverse=True
    ):
        url = INSTALLATION_URL.format(version=app_version)
        minimum = parse_minimum_kube_version(fetch_document(url))
        kube_versions = kube_versions_from_minimum(minimum, latest_kube)
        if not kube_versions:
            continue
        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    if not rows:
        raise ValueError("No documented stable Falco Operator chart versions found")
    return rows


def scrape():
    rows = extract_table_data(
        get_chart_versions(APP_NAME), current_kube_version(), fetch_page
    )
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
