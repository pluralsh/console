from __future__ import annotations

import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "chaos-mesh"
CHART_NAME = "chaos-mesh"
SUPPORTED_RELEASES_URL = "https://chaos-mesh.org/supported-releases/"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _minor(version):
    parsed = validate_semver(str(version).strip().lstrip("v"))
    if not parsed:
        return None
    return f"{parsed.major}.{parsed.minor}"


def _kube_versions(text):
    versions = re.findall(r"\b\d+\.\d+\b", text)
    return [version for version in versions if validate_semver(version)]


def _column(headers, name):
    for index, header in enumerate(headers):
        if header == name:
            return index
    return None


def _strip_cell(cell_html):
    return BeautifulSoup(cell_html, "html.parser").get_text(" ", strip=True)


def _cells(row_html):
    return [
        _strip_cell(match.group(1))
        for match in re.finditer(
            r"<t[dh]\b[^>]*>(.*?)(?=<t[dh]\b[^>]*>|<tr|</tr|</thead|</tbody|</table)",
            row_html,
            re.IGNORECASE | re.DOTALL,
        )
    ]


def _tables(content):
    return re.findall(
        r"<table[^>]*>.*?</table>",
        _decode(content),
        re.IGNORECASE | re.DOTALL,
    )


def parse_support_matrix(content):
    matrix = {}

    for table in _tables(content):
        cells = _cells(table)
        headers = [cell.lower() for cell in cells]
        version_column = _column(headers, "version")
        kube_column = _column(headers, "supported kubernetes versions")
        if version_column is None or kube_column is None:
            continue

        column_count = kube_column + 1
        if column_count < 2:
            continue

        for index in range(column_count, len(cells), column_count):
            row = cells[index:index + column_count]
            if len(row) <= max(version_column, kube_column):
                continue

            release = row[version_column]
            if release.lower() == "master":
                continue

            minor = _minor(release)
            kube = _kube_versions(row[kube_column])
            if minor and kube:
                matrix[minor] = kube

    return matrix


def build_rows(chart_versions, support_matrix):
    rows = []

    for app_version, chart_version in chart_versions.items():
        parsed = validate_semver(app_version)
        if not parsed:
            continue

        kube = support_matrix.get(f"{parsed.major}.{parsed.minor}")
        if not kube:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", str(parsed)),
                    ("kube", kube),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape():
    content = fetch_page(SUPPORTED_RELEASES_URL)
    if not content:
        print_error("Failed to fetch Chaos Mesh supported releases")
        return

    support_matrix = parse_support_matrix(content)
    if not support_matrix:
        print_error("No Chaos Mesh Kubernetes support matrix found")
        return

    chart_versions = get_chart_versions(APP_NAME, CHART_NAME)
    if not chart_versions:
        print_error("No Chaos Mesh chart versions found")
        return

    rows = build_rows(chart_versions, support_matrix)
    if not rows:
        print_error("No Chaos Mesh compatibility rows generated")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml",
        rows,
    )
