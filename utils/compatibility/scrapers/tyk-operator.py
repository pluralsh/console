from __future__ import annotations

import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import (
    expand_kube_versions,
    fetch_page,
    print_error,
    read_yaml,
    update_chart_versions,
    update_compatibility_info,
)

app_name = "tyk-operator"
compatibility_url = "https://tyk.io/docs/api-management/automations/operator"
release_notes_url = "https://tyk.io/docs/developer-support/release-notes/operator"


def get_soup(url: str) -> BeautifulSoup | None:
    content = fetch_page(url)
    if not content:
        return None
    return BeautifulSoup(content, "html.parser")


def normalize_operator_version(value: str) -> str | None:
    match = re.search(r"Tyk Operator\s+v?(\d+\.\d+(?:\.\d+)?)", value)
    if not match:
        return None

    version = match.group(1)
    if re.match(r"^\d+\.\d+$", version):
        version = f"{version}.0"
    return version


def parse_range(value: str) -> list[str]:
    match = re.search(r"(\d+\.\d+)\.x\s+to\s+(\d+\.\d+)\.x", value)
    if not match:
        return []

    start, end = match.groups()
    return list(reversed(expand_kube_versions(start, end)))


def parse_release_note_versions(soup: BeautifulSoup) -> dict[str, list[str]]:
    versions: dict[str, list[str]] = {}

    for heading in soup.find_all(["h3", "h4"]):
        match = re.search(r"(\d+\.\d+\.\d+)\s+Release Notes", heading.get_text(" ", strip=True))
        if not match:
            continue

        version = match.group(1)
        table = heading.find_next("table")
        if not table:
            continue

        for row in table.find_all("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
            if len(cells) < 3 or cells[0] != "Kubernetes":
                continue
            kube_versions = parse_range(cells[2])
            if kube_versions:
                versions[version] = kube_versions
            break

    return versions


def find_table(soup: BeautifulSoup, first_header: str):
    for table in soup.find_all("table"):
        first_row = table.find("tr")
        if not first_row:
            continue
        headers = [cell.get_text(" ", strip=True) for cell in first_row.find_all(["th", "td"])]
        if headers and headers[0] == first_header:
            return table
    return None


def parse_gateway_compatibility(table) -> dict[str, list[str]]:
    if not table:
        return {}

    rows = table.find_all("tr")
    headers = [cell.get_text(" ", strip=True) for cell in rows[0].find_all(["th", "td"])][1:]
    compatibility: dict[str, list[str]] = {}

    for row in rows[1:]:
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
        version = normalize_operator_version(cells[0]) if cells else None
        if not version:
            continue

        requirements = [
            f"Tyk Gateway {gateway_version}"
            for gateway_version, value in zip(headers, cells[1:])
            if value.strip().upper() == "Y"
        ]
        compatibility[version] = requirements

    return compatibility


def parse_kube_compatibility(table, gateway_requirements: dict[str, list[str]]) -> list[OrderedDict[str, object]]:
    if not table:
        return []

    rows = table.find_all("tr")
    headers = [cell.get_text(" ", strip=True) for cell in rows[0].find_all(["th", "td"])][1:]
    versions: list[OrderedDict[str, object]] = []

    for row in rows[1:]:
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
        version = normalize_operator_version(cells[0]) if cells else None
        if not version:
            continue

        kube_versions = [
            kube_version
            for kube_version, value in zip(headers, cells[1:])
            if value.strip().upper() == "Y"
        ]
        if not kube_versions:
            continue

        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", list(reversed(kube_versions))),
                    ("requirements", gateway_requirements.get(version, [])),
                    ("incompatibilities", []),
                ]
            )
        )

    return versions


def scrape() -> None:
    compatibility_soup = get_soup(compatibility_url)
    release_notes_soup = get_soup(release_notes_url)
    if not compatibility_soup or not release_notes_soup:
        return

    gateway_table = find_table(compatibility_soup, "Tyk Version")
    kube_table = find_table(compatibility_soup, "Kubernetes Version")
    gateway_requirements = parse_gateway_compatibility(gateway_table)

    version_map: dict[str, OrderedDict[str, object]] = {}
    for version, kube_versions in parse_release_note_versions(release_notes_soup).items():
        version_map[version] = OrderedDict(
            [
                ("version", version),
                ("kube", kube_versions),
                ("requirements", gateway_requirements.get(version, [])),
                ("incompatibilities", []),
            ]
        )

    for version_info in parse_kube_compatibility(kube_table, gateway_requirements):
        version = version_info["version"]
        if version in version_map:
            # Release notes provide the broader tested/compatible Kubernetes range.
            # Keep that range when both sources mention the same operator version.
            continue
        version_map[version] = version_info

    if not version_map:
        print_error("No compatibility information found for Tyk Operator")
        return

    output_path = f"../../static/compatibilities/{app_name}.yaml"
    update_compatibility_info(output_path, list(version_map.values()))

    compatibility_yaml = read_yaml(output_path)
    if compatibility_yaml and compatibility_yaml.get("helm_repository_url"):
        update_chart_versions(app_name)
