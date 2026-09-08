from __future__ import annotations

import re
from collections import OrderedDict

app_name = "pxc-operator"
compatibility_url = (
    "https://raw.githubusercontent.com/percona/k8spxc-docs/main/docs/versions.md"
)


def _split_markdown_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def _extract_version(cell: str) -> str:
    match = re.search(r"(?<!\d)(\d+\.\d+\.\d+)(?!\d)", cell)
    if not match:
        raise ValueError(f"Unsupported PXC Operator version cell: {cell!r}")
    return match.group(1)


def _parse_kube_versions(value: str) -> set[str]:
    value = value.strip()
    if value == "-":
        return set()

    versions: set[str] = set()
    for token in (part.strip() for part in value.split(",")):
        ranged = re.fullmatch(r"1\.(\d+)\s*-\s*1\.(\d+)", token)
        if ranged:
            start, end = map(int, ranged.groups())
            if start > end:
                raise ValueError(f"Reversed Kubernetes range: {token!r}")
            versions.update(f"1.{minor}" for minor in range(start, end + 1))
            continue

        single = re.fullmatch(r"1\.(\d+)", token)
        if single:
            versions.add(f"1.{int(single.group(1))}")
            continue

        raise ValueError(f"Unsupported Kubernetes version range: {token!r}")

    return versions


def _platform_section(markdown: str) -> list[str]:
    match = re.search(
        r"^##\s+Platforms:\s*$(.*?)(?=^##\s+|\Z)",
        markdown,
        re.MULTILINE | re.DOTALL,
    )
    if not match:
        raise ValueError("Percona Platforms compatibility section not found")
    return [line for line in match.group(1).splitlines() if line.strip().startswith("|")]


def parse_platform_matrix(
    markdown: str, chart_versions: dict[str, str]
) -> list[OrderedDict[str, object]]:
    lines = _platform_section(markdown)
    if len(lines) < 3:
        raise ValueError("Percona Platforms table is empty or malformed")

    header = _split_markdown_row(lines[0])
    header_text = [re.sub(r"\s+", " ", cell).lower() for cell in header]
    try:
        operator_idx = next(i for i, cell in enumerate(header_text) if "operator" in cell)
        gke_idx = next(i for i, cell in enumerate(header_text) if "gke" in cell)
        eks_idx = next(i for i, cell in enumerate(header_text) if "eks" in cell)
        aks_idx = next(i for i, cell in enumerate(header_text) if "aks" in cell)
    except StopIteration as exc:
        raise ValueError("Unexpected Percona Platforms table columns") from exc

    rows: list[OrderedDict[str, object]] = []
    seen: set[str] = set()
    for line in lines[2:]:  # header + markdown alignment row
        cells = _split_markdown_row(line)
        if len(cells) <= max(operator_idx, gke_idx, eks_idx, aks_idx):
            raise ValueError("Malformed Percona Platforms table row")

        version = _extract_version(cells[operator_idx])
        if version in seen:
            raise ValueError(f"Duplicate PXC Operator row: {version}")
        seen.add(version)

        provider_sets = [
            _parse_kube_versions(cells[gke_idx]),
            _parse_kube_versions(cells[eks_idx]),
            _parse_kube_versions(cells[aks_idx]),
        ]

        # Plural stores one generic Kubernetes compatibility list. Percona's
        # matrix is provider-specific, so only claim minor versions tested on
        # all three major managed Kubernetes providers (GKE, EKS and AKS).
        if any(not versions for versions in provider_sets):
            continue
        common = set.intersection(*provider_sets)
        if not common:
            continue

        chart_version = chart_versions.get(version)
        if not chart_version:
            # Do not invent an application/chart pairing not present in the
            # official Percona Helm repository.
            continue

        kube_versions = sorted(
            common,
            key=lambda item: int(item.split(".")[1]),
            reverse=True,
        )
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if not rows:
        raise ValueError("No PXC Operator releases matched official Helm charts")
    return rows


def scrape() -> None:
    from utils import fetch_page, get_chart_versions, update_compatibility_info

    page = fetch_page(compatibility_url)
    if not page:
        raise ValueError("Could not fetch Percona PXC compatibility matrix")
    if isinstance(page, bytes):
        page = page.decode("utf-8")

    rows = parse_platform_matrix(page, get_chart_versions(app_name))
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
