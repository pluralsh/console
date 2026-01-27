from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
)
from collections import OrderedDict
import re

app_name = "coredns"
compatibility_url = (
    "https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/CoreDNS-k8s_version.md"
)


def parse_markdown_table(markdown: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in markdown.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.strip("|").split("|")]
        if len(cols) < 2:
            continue
        header = cols[0].lower()
        if header.startswith("kubernetes version"):
            continue
        if re.fullmatch(r":?-+:?", cols[0]):
            continue
        rows.append((cols[0], cols[1]))
    return rows


def extract_table_data(table_rows: list[tuple[str, str]], chart_versions):
    combined: dict[str, dict[str, object]] = {}
    for kube_cell, coredns_cell in table_rows:
        kubernetes_versions = kube_cell.strip()
        coredns_version = coredns_cell.strip()

        # Remove leading 'v' from CoreDNS version
        coredns_match = re.search(r"\d+\.\d+\.\d+", coredns_version)
        if coredns_match:
            coredns_version = coredns_match.group()
        else:
            print_error(
                f"Failed to parse CoreDNS version from {coredns_version}"
            )
            continue

        # Remove leading 'v' from Kubernetes versions
        kubernetes_versions_list = [
            re.sub(r"^v", "", version.strip())
            for version in re.split(r"&|,", kubernetes_versions)
        ]
        chart_version = chart_versions.get(coredns_version)
        if not chart_version:
            continue

        entry = combined.setdefault(
            coredns_version,
            {"kube": set(), "chart_version": chart_version},
        )
        entry["kube"].update(kubernetes_versions_list)

    rows: list[OrderedDict] = []
    for version, entry in combined.items():
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", sorted(entry["kube"])),
                    ("chart_version", entry["chart_version"]),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def scrape():
    page_content = fetch_page(compatibility_url)
    if not page_content:
        print_error("Failed to fetch page content.")
        return

    markdown = page_content.decode("utf-8", errors="replace")
    table_rows = parse_markdown_table(markdown)
    if not table_rows:
        print_error("No tables found in the page content.")
        return

    chart_versions = get_chart_versions(app_name)
    rows = extract_table_data(table_rows, chart_versions)
    if not rows:
        print_error("No compatibility information found.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
