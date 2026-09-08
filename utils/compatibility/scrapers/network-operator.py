import re

import yaml
from bs4 import BeautifulSoup
from packaging.version import InvalidVersion, Version

APP_NAME = "network-operator"
INDEX_URL = "https://helm.ngc.nvidia.com/nvidia/index.yaml"
DOC_URL = (
    "https://docs.nvidia.com/networking/display/"
    "kubernetes{slug}/platform-support.html"
)


def stable_charts(content):
    entries = yaml.safe_load(content).get("entries", {}).get(APP_NAME)
    if not entries:
        raise ValueError("Network Operator chart entries not found")
    charts = {}
    for entry in entries:
        try:
            app = str(entry["appVersion"]).lstrip("v")
            chart = str(entry["version"])
            av, cv = Version(app), Version(chart)
        except (KeyError, InvalidVersion):
            continue
        if not re.fullmatch(r"\d+\.\d+\.\d+", app):
            continue
        if av.is_prerelease or cv.is_prerelease or cv.is_devrelease or cv.local:
            continue
        if app not in charts or cv > Version(charts[app]):
            charts[app] = chart
    if not charts:
        raise ValueError("No stable Network Operator charts found")
    return dict(sorted(charts.items(), key=lambda item: Version(item[0]), reverse=True))


def parse_support(content, version):
    soup = BeautifulSoup(content, "html.parser")
    identities = set(re.findall(
        r"NVIDIA Network Operator v(\d+\.\d+\.\d+)",
        soup.get_text(" ", strip=True),
    ))
    if identities != {version}:
        raise ValueError(f"Documentation identity mismatch for {version}: {identities}")
    constraints = set()
    for table in soup.find_all("table"):
        headers = [cell.get_text(" ", strip=True) for cell in table.find_all("th")]
        if headers[:2] != ["Component", "Version"]:
            continue
        for row in table.find_all("tr"):
            cells = row.find_all("td", recursive=False)
            if len(cells) >= 2 and cells[0].get_text(" ", strip=True) == "Kubernetes":
                constraints.add(cells[1].get_text(" ", strip=True))
    if len(constraints) != 1:
        raise ValueError(f"Expected one Kubernetes prerequisite for {version}")
    constraint = constraints.pop()
    match = re.fullmatch(r">=1\.(\d+)\s+and\s+<=1\.(\d+)", constraint)
    if not match:
        # A minor-only matrix cannot express a ceiling such as 1.30.4.
        raise ValueError(f"Cannot represent Kubernetes prerequisite: {constraint}")
    start, end = map(int, match.groups())
    if start > end:
        raise ValueError("Reversed Kubernetes prerequisite range")
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def build_rows(index, fetch, warn=print):
    rows = []
    for version, chart in stable_charts(index).items():
        url = DOC_URL.format(slug=version.replace(".", ""))
        content = fetch(url)
        if not content:
            warn(f"Skipping {version}: no version-specific support page")
            continue
        try:
            kube = parse_support(content, version)
        except ValueError as error:
            warn(f"Skipping {version}: {error}")
            continue
        rows.append({
            "version": version,
            "kube": kube,
            "chart_version": chart,
            "requirements": [],
            "incompatibilities": [],
        })
    if not rows:
        raise ValueError("No representable Network Operator compatibility rows")
    return rows


def scrape():
    from utils import fetch_page, print_warning, update_compatibility_info

    index = fetch_page(INDEX_URL)
    if not index:
        raise ValueError("Could not fetch official NVIDIA Helm index")
    rows = build_rows(index, fetch_page, print_warning)
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
