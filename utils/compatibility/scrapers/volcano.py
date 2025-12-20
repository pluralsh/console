import re
from collections import OrderedDict

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "volcano"
README_URL = "https://raw.githubusercontent.com/volcano-sh/volcano/master/README.md"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def parse_markdown_table(markdown: str, head_version: str | None = None) -> list[OrderedDict]:
    if "## Kubernetes compatibility" not in markdown:
        print_error("Could not find 'Kubernetes compatibility' section in README.")
        return []

    section = markdown.split("## Kubernetes compatibility", 1)[-1]
    if "Key:" in section:
        section = section.split("Key:", 1)[0]

    lines = [
        line.strip()
        for line in section.splitlines()
        if line.strip().startswith("|") and line.strip().endswith("|")
    ]
    if len(lines) < 3:
        print_error("Kubernetes compatibility table is missing or malformed.")
        return []

    def parse_row(row: str) -> list[str]:
        return [cell.strip() for cell in row.strip().strip("|").split("|")]

    header_cells = parse_row(lines[0])
    kube_headers: list[str] = []
    for cell in header_cells[1:]:
        match = re.search(r"(\d+\.\d+)", cell)
        kube_headers.append(match.group(1) if match else cell)

    versions: list[OrderedDict] = []
    separator_chars = {"-", " "}
    for row in lines[2:]:
        test_row = row.replace("|", "").strip()
        if test_row and set(test_row) <= separator_chars:
            continue

        cells = parse_row(row)
        if not cells or len(cells) < 2:
            continue

        label = cells[0]
        match = re.search(r"v(\d+\.\d+)", label, re.IGNORECASE)
        version = None
        if match:
            version = match.group(1)
        elif head_version and "head" in label.lower():
            version = head_version
        else:
            continue

        as_semver = validate_semver(version)
        if as_semver:
            version = str(as_semver)
        else:
            continue

        kube_list: list[str] = []
        for kube, status in zip(kube_headers, cells[1:]):
            marker = status.strip()
            if marker and marker != "-":
                kube_list.append(kube)

        if not kube_list:
            continue

        kube_list = sorted(
            set(kube_list),
            key=lambda v: tuple(map(int, v.split("."))),
            reverse=True,
        )

        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_list),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return versions


def scrape():
    content = fetch_page(README_URL)
    if not content:
        print_error("Failed to download Volcano README.")
        return

    markdown = content.decode("utf-8", errors="replace")

    chart_versions = get_chart_versions(APP_NAME)

    # Use the latest stable appVersion from the chart index for the HEAD row.
    latest_chart_version = None
    if chart_versions:
        parsed_versions = [
            validate_semver(v) for v in chart_versions.keys() if validate_semver(v)
        ]
        stable_versions = [v for v in parsed_versions if not v.prerelease]
        target = max(stable_versions, default=None) or max(parsed_versions, default=None)
        if target:
            latest_chart_version = str(target)

    versions = parse_markdown_table(markdown, latest_chart_version)
    if not versions:
        print_error("No Volcano compatibility data extracted.")
        return

    if chart_versions:
        for entry in versions:
            chart_version = chart_versions.get(entry["version"])
            if chart_version:
                entry["chart_version"] = chart_version

    update_compatibility_info(TARGET_FILE, versions)
