from __future__ import annotations

import re
from collections import OrderedDict

from packaging.version import InvalidVersion, Version

from utils import fetch_page, get_chart_versions, update_compatibility_info


app_name = "vertical-pod-autoscaler"
compatibility_url = (
    "https://raw.githubusercontent.com/kubernetes/autoscaler/master/"
    "vertical-pod-autoscaler/docs/installation.md"
)
compatibility_file = f"../../static/compatibilities/{app_name}.yaml"


def _decode(content: bytes | str) -> str:
    if isinstance(content, str):
        return content
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(
            "Could not decode the VPA installation documentation as UTF-8"
        ) from exc


def _expand_descending(start: str, end: str) -> list[str]:
    start_major, start_minor = map(int, start.split("."))
    end_major, end_minor = map(int, end.split("."))
    if start_major != end_major or start_minor > end_minor:
        raise ValueError(f"Unsupported VPA Kubernetes range: {start} - {end}")
    if end_minor - start_minor > 50:
        raise ValueError(
            f"VPA Kubernetes range is unexpectedly large: {start} - {end}"
        )
    return [
        f"{start_major}.{minor}"
        for minor in range(end_minor, start_minor - 1, -1)
    ]


def parse_compatibility_matrix(content: bytes | str) -> dict[str, list[str]]:
    """Parse the bounded compatibility table from the official VPA docs."""
    text = _decode(content)
    section_match = re.search(r"(?m)^## Compatibility\s*$", text)
    if not section_match:
        raise ValueError("VPA documentation is missing the Compatibility section")

    section = text[section_match.end() :]
    next_section = re.search(r"(?m)^##\s+", section)
    if next_section:
        section = section[: next_section.start()]

    matrix: dict[str, list[str]] = {}
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        columns = [
            column.strip().strip("`")
            for column in stripped.strip("|").split("|")
        ]
        if len(columns) < 2:
            continue

        vpa_cell, kube_cell = columns[:2]
        if vpa_cell.lower() == "vpa version" or set(vpa_cell) <= {"-", ":", " "}:
            continue

        version_match = re.fullmatch(r"(\d+\.\d+)\.x", vpa_cell)
        if not version_match:
            if re.search(r"\d", vpa_cell):
                raise ValueError(f"Unrecognized VPA version cell: {vpa_cell!r}")
            continue

        range_match = re.fullmatch(
            r"v?(\d+\.\d+)\s*[-\u2013\u2014]\s*v?(\d+\.\d+)", kube_cell
        )
        if not range_match:
            raise ValueError(
                "Unrecognized Kubernetes compatibility range for VPA "
                f"{vpa_cell}: {kube_cell!r}"
            )

        minor = version_match.group(1)
        if minor in matrix:
            raise ValueError(f"Duplicate VPA compatibility row for {minor}.x")
        matrix[minor] = _expand_descending(*range_match.groups())

    if not matrix:
        raise ValueError("No VPA compatibility rows were found")
    return matrix


def _stable_version(value: str) -> Version | None:
    try:
        parsed = Version(value.lstrip("v"))
    except InvalidVersion:
        return None
    if parsed.is_prerelease or parsed.is_devrelease:
        return None
    return parsed


def build_rows(
    compatibility_matrix: dict[str, list[str]], chart_versions: dict[str, str]
) -> list[OrderedDict[str, object]]:
    """Choose the newest stable VPA patch for each documented minor."""
    selected: dict[str, tuple[Version, str, str]] = {}

    for raw_app_version, raw_chart_version in chart_versions.items():
        app_version = _stable_version(str(raw_app_version))
        chart_version = _stable_version(str(raw_chart_version))
        if app_version is None or chart_version is None:
            continue

        minor = f"{app_version.major}.{app_version.minor}"
        if minor not in compatibility_matrix:
            continue

        current = selected.get(minor)
        if current is None or app_version > current[0]:
            selected[minor] = (
                app_version,
                str(raw_app_version).lstrip("v"),
                str(raw_chart_version).lstrip("v"),
            )

    missing = sorted(set(compatibility_matrix) - set(selected), key=Version)
    if missing:
        raise ValueError(
            "No stable VPA Helm chart mapping found for documented minor(s): "
            + ", ".join(f"{minor}.x" for minor in missing)
        )

    rows: list[OrderedDict[str, object]] = []
    for minor, (_, app_version, chart_version) in selected.items():
        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", compatibility_matrix[minor]),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    rows.sort(key=lambda row: Version(str(row["version"])), reverse=True)
    return rows


def scrape() -> None:
    content = fetch_page(compatibility_url)
    if not content:
        raise ValueError("Could not fetch the VPA installation documentation")

    matrix = parse_compatibility_matrix(content)
    chart_versions = get_chart_versions(app_name)
    if not chart_versions:
        raise ValueError("Could not resolve VPA Helm chart versions")

    rows = build_rows(matrix, chart_versions)
    update_compatibility_info(compatibility_file, rows)
