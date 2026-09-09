"""Read Kuma's documented Kubernetes test targets for each release family."""

import re
from collections import OrderedDict

import requests
import yaml

from utils import fetch_page, get_chart_versions, update_compatibility_info, validate_semver

app_name = "kuma"
versions_url = "https://raw.githubusercontent.com/kumahq/kuma-website/master/app/_data/versions.yml"
source_url = "https://raw.githubusercontent.com/kumahq/kuma/{tag}/mk/dev.mk"
output_path = "../../static/compatibilities/kuma.yaml"


def select_releases(catalog, chart_versions):
    """Select the newest stable, chart-backed patch in each documented family."""
    families = set()
    for entry in catalog:
        if entry.get("edition") != "kuma" or entry.get("label") == "dev":
            continue
        match = re.fullmatch(r"(\d+)\.(\d+)\.x", entry.get("release", ""))
        if match:
            families.add(tuple(map(int, match.groups())))
    if not families:
        raise ValueError("No released Kuma families found in the documentation catalog")

    selected = {}
    for version, chart_version in chart_versions.items():
        app = validate_semver(version)
        chart = validate_semver(chart_version)
        if not app or not chart:
            continue
        family = (app.major, app.minor)
        if family in families and (family not in selected or app > selected[family][0]):
            selected[family] = (app, chart_version)
    if families - selected.keys():
        raise ValueError("A documented Kuma family has no stable Helm chart")
    return sorted(selected.values(), key=lambda item: item[0], reverse=True)


def parse_kube_versions(content):
    """Keep the two tested targets, without interpolating the versions between."""
    targets = {}
    for line in content.splitlines():
        match = re.fullmatch(
            r"\s*K8S_(MIN|MAX)_VERSION\s*[:?]?=\s*v(\d+\.\d+)\.\d+"
            r"(?:-[\w.-]+)?\s*(?:#.*)?", line
        )
        if match:
            targets[match[1]] = match[2]
    if set(targets) != {"MIN", "MAX"}:
        raise ValueError("Missing Kuma Kubernetes test targets in mk/dev.mk")
    return sorted(set(targets.values()), key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def fetch_release_targets(version):
    # Kuma changed from unprefixed release tags to v-prefixed tags. Only a 404
    # permits trying the older spelling; network/server failures must propagate.
    response = requests.get(source_url.format(tag=f"v{version}"), timeout=30)
    if response.status_code == 404:
        response = requests.get(source_url.format(tag=version), timeout=30)
    response.raise_for_status()
    return parse_kube_versions(response.text)


def scrape():
    content = fetch_page(versions_url)
    if not content:
        raise ValueError("Could not fetch Kuma's release catalog")
    releases = select_releases(yaml.safe_load(content), get_chart_versions(app_name))
    rows = []
    for version, chart_version in releases:
        rows.append(OrderedDict([
            ("version", str(version)),
            ("kube", fetch_release_targets(str(version))),
            ("chart_version", chart_version),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    # Resolve all sources before invoking the shared writer, preserving the
    # previous table if any selected release cannot be read or parsed.
    update_compatibility_info(output_path, rows)
