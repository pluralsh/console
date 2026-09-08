from __future__ import annotations

import re
from collections import OrderedDict

app_name = "redis-enterprise-operator"
compatibility_url = (
    "https://raw.githubusercontent.com/redis/docs/main/"
    "content/operate/kubernetes/reference/supported_k8s_distributions.md"
)

_VERSION_RE = re.compile(r"(?<![\d.])(\d+\.\d+\.\d+-\d+)(?!\d)")
_KUBE_RE = re.compile(r"^1\.(\d+)$")


def _split_markdown_row(line: str) -> list[str]:
    cells = [cell.strip() for cell in line.strip().split("|")]
    if cells and not cells[0]:
        cells = cells[1:]
    if cells and not cells[-1]:
        cells = cells[:-1]
    return cells


def _extract_operator_versions(line: str) -> list[str]:
    if "Redis operator" not in line:
        raise ValueError("Redis operator version-history header not found")

    versions = _VERSION_RE.findall(line)
    if not versions:
        raise ValueError("Redis operator version-history header has no versions")
    if len(versions) != len(set(versions)):
        raise ValueError("Duplicate Redis operator version in version-history header")
    return versions


def _split_operator_version(version: str) -> tuple[str, int]:
    match = re.fullmatch(r"(\d+\.\d+\.\d+)-(\d+)", version)
    if not match:
        raise ValueError(f"Unsupported Redis operator version: {version!r}")
    return match.group(1), int(match.group(2))


def _status_supported(cell: str) -> bool:
    if not cell:
        return False
    if 'title="Supported"' in cell:
        return True
    if 'title="Deprecation warning"' in cell:
        # Redis explicitly documents Deprecated as still supported, with removal
        # planned for a future release.
        return True
    if 'title="X icon"' in cell:
        return False
    raise ValueError(f"Unexpected Redis Kubernetes support marker: {cell!r}")


def parse_support_matrix(
    markdown: str, chart_versions: dict[str, str]
) -> list[OrderedDict[str, object]]:
    lines = markdown.splitlines()

    header_index = next(
        (i for i, line in enumerate(lines) if "Redis operator" in line and "<nobr>" in line),
        None,
    )
    if header_index is None:
        raise ValueError("Redis operator version-history header not found")

    operator_versions = _extract_operator_versions(lines[header_index])

    kube_header_index = next(
        (
            i
            for i in range(header_index + 1, len(lines))
            if re.fullmatch(
                r"\s*\|\s*OpenShift\s*\|\s*Kubernetes\s*\|.*",
                lines[i],
                re.IGNORECASE,
            )
        ),
        None,
    )
    if kube_header_index is None:
        raise ValueError("Redis Kubernetes version-history rows not found")

    kube_by_operator: dict[str, list[str]] = {version: [] for version in operator_versions}
    parsed_kube_rows = 0

    for line in lines[kube_header_index + 1 :]:
        stripped = line.strip()
        if stripped.startswith("{{<") or stripped.startswith("{{</"):
            break
        if not stripped:
            if parsed_kube_rows:
                break
            continue
        if not stripped.startswith("|"):
            if parsed_kube_rows:
                break
            continue

        cells = _split_markdown_row(stripped)
        if len(cells) < 2:
            raise ValueError("Malformed Redis compatibility table row")

        kube = cells[1]
        if not _KUBE_RE.fullmatch(kube):
            if re.fullmatch(r":?-+:?", kube):
                continue
            raise ValueError(f"Unexpected Redis Kubernetes version: {kube!r}")

        expected_cells = 2 + len(operator_versions)
        if len(cells) != expected_cells:
            raise ValueError(
                "Redis compatibility row column count does not match operator header"
            )

        parsed_kube_rows += 1
        for index, source_version in enumerate(operator_versions):
            if _status_supported(cells[index + 2]):
                kube_by_operator[source_version].append(kube)

    if not parsed_kube_rows:
        raise ValueError("Redis Kubernetes version-history table is empty")

    # Redis versions use a fourth build component such as 8.2.0-12. Plural's
    # shared compatibility reducer intentionally accepts stable semantic versions
    # only, so expose 8.2.0 as the application version while retaining the exact
    # Redis build in chart_version. If Redis documents multiple builds for the
    # same semantic version, keep the newest documented build that also exists in
    # the official Helm repository.
    selected: dict[str, tuple[int, str, str, list[str]]] = {}
    for source_version in operator_versions:
        kube_versions = kube_by_operator[source_version]
        if not kube_versions:
            continue

        chart_version = chart_versions.get(source_version)
        if not chart_version:
            # Never guess a chart/operator pairing. Only publish source releases
            # that are present in Redis' official Helm repository.
            continue

        base_version, build = _split_operator_version(source_version)
        current = selected.get(base_version)
        if current is None or build > current[0]:
            selected[base_version] = (
                build,
                source_version,
                chart_version,
                kube_versions,
            )

    if not selected:
        raise ValueError("No Redis operator releases matched official Helm charts")

    rows: list[OrderedDict[str, object]] = []
    for base_version in sorted(
        selected,
        key=lambda value: tuple(int(part) for part in value.split(".")),
        reverse=True,
    ):
        _, _, chart_version, kube_versions = selected[base_version]
        rows.append(
            OrderedDict(
                [
                    ("version", base_version),
                    (
                        "kube",
                        sorted(
                            set(kube_versions),
                            key=lambda item: int(item.split(".")[1]),
                            reverse=True,
                        ),
                    ),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape() -> None:
    from utils import fetch_page, get_chart_versions, update_compatibility_info

    page = fetch_page(compatibility_url)
    if not page:
        raise ValueError("Could not fetch Redis Kubernetes compatibility matrix")
    if isinstance(page, bytes):
        page = page.decode("utf-8")
    elif not isinstance(page, str):
        raise ValueError("Unexpected Redis compatibility payload type")

    rows = parse_support_matrix(page, get_chart_versions(app_name))
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
