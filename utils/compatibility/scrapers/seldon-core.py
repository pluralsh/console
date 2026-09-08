"""Scrape the Seldon Core 1 Kubernetes compatibility matrix."""

from __future__ import annotations

import re
from collections import OrderedDict

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
)


APP_NAME = "seldon-core"
COMPATIBILITY_URL = (
    "https://docs.seldon.ai/seldon-core-1/"
    "getting-started/installation/installation.md"
)
CHART_NAME = "seldon-core-operator"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"

_STABLE_VERSION_RE = re.compile(r"v?\d+\.\d+\.\d+$")


def _decode(content: bytes | str) -> str:
    return content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content


def _table_columns(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped.startswith("|"):
        return []
    if stripped.endswith("|"):
        stripped = stripped[1:-1]
    else:
        stripped = stripped[1:]
    return [column.strip() for column in stripped.split("|")]


def _is_separator(columns: list[str]) -> bool:
    return bool(columns) and all(re.fullmatch(r":?-+:?", column) for column in columns)


def _normalize_minor(value: str) -> str | None:
    match = re.fullmatch(r"v?(\d+)\.(\d+)", value.strip())
    if not match:
        return None
    return f"{int(match.group(1))}.{int(match.group(2))}"


def _normalize_core_version(value: str) -> str | None:
    minor = _normalize_minor(value)
    return f"{minor}.0" if minor else None


def parse_compatibility_matrix(content: bytes | str) -> dict[str, list[str]]:
    """Return only Kubernetes columns whose source cell contains a checkmark.

    The source is a Markdown table with a Core version row and one column per
    Kubernetes minor. Blank cells are unsupported and are deliberately omitted.
    """

    lines = _decode(content).splitlines()
    table: list[list[str]] = []
    candidates: list[list[list[str]]] = []
    for line in lines:
        columns = _table_columns(line)
        if columns:
            table.append(columns)
            continue
        if table:
            candidates.append(table)
            table = []
    if table:
        candidates.append(table)

    for candidate in candidates:
        if len(candidate) < 3 or not _is_matrix_header(candidate[0]):
            continue
        headers = candidate[0]
        if not _is_separator(candidate[1]) or len(candidate[1]) != len(headers):
            raise ValueError("Malformed Seldon Core Kubernetes compatibility table")

        kube_headers = [_normalize_minor(value) for value in headers[1:]]
        if not kube_headers or any(value is None for value in kube_headers):
            raise ValueError("Invalid Kubernetes version header in Seldon Core matrix")
        if len(set(kube_headers)) != len(kube_headers):
            raise ValueError("Duplicate Kubernetes version header in Seldon Core matrix")

        rows: dict[str, list[str]] = {}
        for columns in candidate[2:]:
            if len(columns) != len(headers):
                raise ValueError("Malformed row in Seldon Core Kubernetes compatibility table")
            core_version = _normalize_core_version(columns[0])
            if not core_version or core_version in rows:
                raise ValueError("Invalid or duplicate Core version in Seldon Core matrix")

            # A checkmark is the only positive compatibility signal. Do not
            # turn a minimum version or a blank cell into a compatibility range.
            supported = [
                kube_version
                for kube_version, cell in zip(kube_headers, columns[1:])
                if cell == "✓"
            ]
            if not supported:
                raise ValueError(
                    f"Core {core_version} has no checked Kubernetes versions"
                )
            rows[core_version] = supported

        if not rows:
            raise ValueError("Seldon Core Kubernetes compatibility table is empty")
        return rows

    raise ValueError("Seldon Core Kubernetes compatibility table not found")


def _is_matrix_header(columns: list[str]) -> bool:
    if not columns:
        return False
    title = columns[0].lower().replace("\\", " ")
    return "core version" in title and any(
        token in title for token in ("k8s", "kubernetes")
    )


def extract_table_data(
    compatibility_matrix: dict[str, list[str]], chart_versions: dict[str, str]
) -> list[OrderedDict]:
    matrix_by_minor = {
        version.rsplit(".", 1)[0]: kube_versions
        for version, kube_versions in compatibility_matrix.items()
    }
    represented_minors = {
        ".".join(version.split(".")[:2])
        for version in chart_versions
        if _STABLE_VERSION_RE.fullmatch(version)
    }
    missing = set(matrix_by_minor) - represented_minors
    if missing:
        raise ValueError(
            "No Helm chart mapping for Seldon Core versions: "
            + ", ".join(sorted(missing))
        )

    latest_by_minor: dict[str, tuple[str, str]] = {}
    for version, chart_version in chart_versions.items():
        if not _STABLE_VERSION_RE.fullmatch(version):
            continue
        minor = ".".join(version.split(".")[:2])
        kube_versions = matrix_by_minor.get(minor)
        if not kube_versions:
            continue
        current = latest_by_minor.get(minor)
        if current and _version_tuple(current[0]) >= _version_tuple(version):
            continue
        latest_by_minor[minor] = (version, chart_version)

    rows = []
    for minor, (version, chart_version) in latest_by_minor.items():
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", matrix_by_minor[minor]),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def _version_tuple(version: str) -> tuple[int, int, int]:
    return tuple(int(part) for part in version.lstrip("v").split("."))


def scrape() -> None:
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        print_error("Failed to fetch Seldon Core compatibility documentation.")
        return

    try:
        matrix = parse_compatibility_matrix(content)
        chart_versions = get_chart_versions(APP_NAME, CHART_NAME)
        rows = extract_table_data(matrix, chart_versions)
    except ValueError as exc:
        print_error(str(exc))
        return

    if not rows:
        print_error("No Seldon Core compatibility rows extracted.")
        return
    update_compatibility_info(TARGET_FILE, rows)
