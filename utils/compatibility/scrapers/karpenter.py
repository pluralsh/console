# scrapers/cert_manager.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
    expand_kube_versions,
)

app_name = "karpenter"
compatibility_url = "https://karpenter.sh/preview/upgrading/compatibility/"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    for section in sections:
        if section.text == "Compatibility Matrix":
            return section.find_next("table")
    return sections


def find_target_tables(sections):
    target_tables = []
    table = []

    for section in sections:
        for text in section.stripped_strings:
            lines = [line.strip() for line in text.split("\n") if line.strip()]

            # If "KUBERNETES" or "karpenter" is found, start a new table
            if lines and (lines[0] in ["KUBERNETES", "karpenter"]):
                if (
                    table
                ):  # If there's an existing table, add it to target_tables
                    target_tables.append(table)
                table = lines  # Start a new table
            else:
                # Add the lines to the current table
                table.extend(lines)

    # Add the last table if it exists
    if table:
        target_tables.append(table)

    return target_tables


def extract_table_data(target_tables, chart_versions):
    if len(target_tables) < 2:
        print_error("Insufficient data in target tables.")
        return []

    k8s_versions = target_tables[0][1:]  # Starting from the second element
    kar_versions = target_tables[1][1:]  # Starting from the second element

    rows = []
    for k8s_ver, kar_ver in zip(k8s_versions, kar_versions):
        expanded_k8s_ver = expand_kube_versions("1.19", k8s_ver)
        kar_ver = kar_ver.split(" ")[1].strip()
        kar_ver = validate_semver(kar_ver)

        if kar_ver:
            ver = str(kar_ver)
            chart_version = chart_versions.get(ver)
            if not chart_version:
                continue
            version_info = OrderedDict(
                {
                    "version": ver,
                    "kube": expanded_k8s_ver,
                    "chart_version": chart_version,
                    "requirements": [],
                    "incompatibilities": [],
                }
            )
            rows.append(version_info)

    return rows


def scrape():

    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    sections = parse_page(page_content)
    target_tables = find_target_tables(sections)
    if target_tables.__len__() >= 1:
        chart_versions = get_chart_versions(app_name)
        rows = extract_table_data(target_tables, chart_versions)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

