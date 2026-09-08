"""Antrea prerequisites from the README at each released application tag."""

import re
from collections import OrderedDict

from packaging.version import Version

README_URL = "https://raw.githubusercontent.com/antrea-io/antrea/v{version}/README.md"


def parse_minimum(markdown):
    section = re.search(r"^## Prerequisites\s*$(.*?)(?=^## |\Z)", markdown, re.M | re.S)
    if not section:
        raise ValueError("Antrea Prerequisites section not found")
    matches = re.findall(
        r"Antrea has been tested with Kubernetes clusters running version\s+1\.(\d+) or later\.",
        section.group(1),
    )
    if len(matches) != 1:
        raise ValueError("Expected one explicit Antrea Kubernetes minimum")
    return int(matches[0])


def build_rows(chart_versions, current_kube, fetch_readme):
    """Map chart appVersions to their own release's documented lower bound.

    The open upper bound is expanded only through the repository's KUBE_VERSION.
    This encodes upstream's 'or later' policy, not additional local cluster tests.
    """
    ceiling = re.fullmatch(r"1\.(\d+)", current_kube)
    if not ceiling:
        raise ValueError(f"Unsupported Kubernetes upper bound: {current_kube}")
    latest_minor = int(ceiling.group(1))
    rows = []
    for app, chart in chart_versions.items():
        if not re.fullmatch(r"\d+\.\d+\.\d+", app):
            continue
        if Version(app) < Version("1.8.0"):
            continue  # Official Helm distribution starts at v1.8.
        if not re.fullmatch(r"\d+\.\d+\.\d+", chart):
            continue
        url = README_URL.format(version=app)
        page = fetch_readme(url)
        if not page:
            raise ValueError(f"Could not fetch Antrea prerequisites: {url}")
        minimum = parse_minimum(page.decode("utf-8"))
        if minimum > latest_minor:
            raise ValueError(f"Kubernetes upper bound precedes minimum for Antrea {app}")
        rows.append(OrderedDict([
            ("version", app),
            ("kube", [f"1.{minor}" for minor in range(latest_minor, minimum - 1, -1)]),
            ("chart_version", chart),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    if not rows:
        raise ValueError("No stable Antrea Helm releases found")
    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    from utils import fetch_page, get_chart_versions, current_kube_version, update_compatibility_info

    rows = build_rows(get_chart_versions("antrea"), current_kube_version(), fetch_page)
    update_compatibility_info("../../static/compatibilities/antrea.yaml", rows)
