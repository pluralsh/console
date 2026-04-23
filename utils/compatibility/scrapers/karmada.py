import re
from collections import OrderedDict

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "karmada"
README_URL = "https://raw.githubusercontent.com/karmada-io/karmada/master/README.md"
HELM_REPO_URL = "https://raw.githubusercontent.com/karmada-io/karmada/master/charts"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
SUPPORTED_MARKERS = {"✓", "+", "✔"}


def extract_table_lines(markdown: str) -> list[str]:
    if "## Kubernetes compatibility" not in markdown:
        return []

    section = markdown.split("## Kubernetes compatibility", 1)[1]
    lines: list[str] = []
    for line in section.splitlines():
        stripped = line.strip()
        if stripped.startswith("|"):
            lines.append(stripped)
        elif lines:
            break
    return lines


def parse_header(line: str) -> list[str]:
    cells = [cell.strip() for cell in line.strip("|").split("|")]
    kube_headers: list[str] = []
    for cell in cells[1:]:
        match = re.search(r"(\d+\.\d+)", cell)
        if match:
            kube_headers.append(match.group(1))
    return kube_headers


def normalize_version(label: str) -> str | None:
    match = re.search(r"(\d+\.\d+)", label)
    if not match:
        return None

    version = f"{match.group(1)}.0"
    semver = validate_semver(version)
    if not semver:
        return None
    return str(semver)


def parse_versions(markdown: str) -> list[OrderedDict]:
    lines = extract_table_lines(markdown)
    if len(lines) < 3:
        return []

    header = parse_header(lines[0])
    if not header:
        return []

    versions: list[OrderedDict] = []
    for row in lines[2:]:
        stripped = row.replace("|", "").strip()
        if not stripped or all(ch in "-:" for ch in stripped):
            continue

        cells = [cell.strip() for cell in row.strip("|").split("|")]
        if not cells:
            continue

        version = normalize_version(cells[0])
        if not version:
            continue

        kube_list: list[str] = []
        for kube, cell in zip(header, cells[1:]):
            marker = cell.strip()
            if any(symbol in marker for symbol in SUPPORTED_MARKERS):
                kube_list.append(kube)

        if not kube_list:
            continue

        kube_unique = sorted(
            set(kube_list),
            key=lambda v: tuple(map(int, v.split("."))),
            reverse=True,
        )

        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_unique),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return versions


def scrape():
    content = fetch_page(README_URL)
    if not content:
        print_error("Failed to download Karmada README.")
        return

    markdown = content.decode("utf-8", errors="replace")
    versions = parse_versions(markdown)
    if not versions:
        print_error("No Karmada compatibility data extracted.")
        return

    chart_versions = get_chart_versions(APP_NAME)
    if chart_versions:
        for entry in versions:
            chart_version = chart_versions.get(entry["version"])
            if chart_version:
                entry["chart_version"] = chart_version

    update_compatibility_info(TARGET_FILE, versions)
