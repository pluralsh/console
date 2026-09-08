import re
from collections import OrderedDict

from utils import fetch_page, get_chart_versions, print_error, update_compatibility_info


APP_NAME = "karmada"
MATRIX_URL = "https://raw.githubusercontent.com/karmada-io/karmada/master/README.md"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip()[1:-1].split("|")]


def parse_page(content: bytes | str) -> list[OrderedDict]:
    """Read released versions and explicitly checked cells from the official matrix."""
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    section = re.search(
        r"^## Kubernetes compatibility\s*\n(.*?)(?=^#{1,2} |\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if not section:
        raise ValueError("Karmada Kubernetes compatibility section not found")

    tables = re.findall(r"(?:^[ \t]*\|[^\n]*\|[ \t]*(?:\n|$))+", section.group(1), re.MULTILINE)
    for table in tables:
        lines = [line for line in table.splitlines() if line.strip()]
        headers = _cells(lines[0])
        if len(headers) < 2 or not any("Kubernetes" in h for h in headers[1:]):
            continue
        if not all(re.fullmatch(r"Kubernetes \d+\.\d+", h) for h in headers[1:]):
            raise ValueError("Unrecognized Kubernetes column in Karmada matrix")
        kube_columns = [h.split()[1] for h in headers[1:]]
        if len(kube_columns) != len(set(kube_columns)):
            raise ValueError("Duplicate Kubernetes column in Karmada matrix")
        if len(lines) < 2 or len(_cells(lines[1])) != len(headers) or not all(
            re.fullmatch(r":?-+:?", cell) for cell in _cells(lines[1])
        ):
            raise ValueError("Invalid Karmada matrix table separator")

        versions = {}
        for line in lines[2:]:
            cells = _cells(line)
            if len(cells) != len(headers):
                raise ValueError("Incomplete Karmada compatibility row")
            if cells[0] == "Karmada HEAD (master)":
                continue
            release = re.fullmatch(r"Karmada v(\d+\.\d+)(?:\.(\d+))?", cells[0])
            if not release:
                raise ValueError(f"Unrecognized Karmada release: {cells[0]}")
            # The matrix describes release series. Store its .0 boundary only
            # when an exact appVersion-to-chart mapping exists in the Helm index.
            version = f"{release.group(1)}.{release.group(2) or '0'}"
            if version in versions:
                raise ValueError(f"Duplicate Karmada release: {version}")
            if any(mark not in ("✓", "+", "-", "") for mark in cells[1:]):
                raise ValueError(f"Unrecognized compatibility marker for {version}")
            kube = [k for k, mark in zip(kube_columns, cells[1:]) if mark == "✓"]
            if not kube:
                raise ValueError(f"No explicitly compatible Kubernetes versions for {version}")
            versions[version] = OrderedDict(
                version=version,
                kube=sorted(kube, key=lambda v: tuple(map(int, v.split("."))), reverse=True),
                requirements=[],
                incompatibilities=[],
            )
        if versions:
            return sorted(
                versions.values(),
                key=lambda row: tuple(map(int, row["version"].split("."))),
                reverse=True,
            )
    raise ValueError("No released Karmada compatibility rows found")


def scrape() -> None:
    try:
        content = fetch_page(MATRIX_URL)
        if not content:
            raise ValueError("Failed to fetch Karmada compatibility matrix")
        versions = parse_page(content)
        chart_versions = get_chart_versions(APP_NAME)
        for row in versions:
            chart_version = chart_versions.get(row["version"])
            if not isinstance(chart_version, str) or not re.fullmatch(
                r"\d+\.\d+\.\d+", chart_version
            ):
                raise ValueError(f"No stable Helm chart for Karmada {row['version']}")
            row["chart_version"] = chart_version
    except Exception as exc:
        print_error(f"Cannot update Karmada compatibility: {exc}")
        return

    # Resolve the complete matrix and all charts before updating persisted data.
    update_compatibility_info(TARGET_FILE, versions)
