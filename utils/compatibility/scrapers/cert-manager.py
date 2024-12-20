# scrapers/cert_manager.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
)


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if section.get_text(strip=True) in [
            "Currently supported releases",
            "Old cert-manager releases",
        ]:
            table = section.find_next("table")
            if table:
                target_tables.append(table)
    return target_tables


def expand_kube_versions(version_range):
    start_version, end_version = version_range.split(" → ")
    start_major, start_minor = map(int, start_version.split("."))
    end_major, end_minor = map(int, end_version.split("."))

    expanded_versions = []
    major = start_major
    minor = start_minor
    while (major < end_major) or (major == end_major and minor <= end_minor):
        expanded_versions.append(f"{major}.{minor}")
        if minor == 9:
            major += 1
            minor = 0
        else:
            minor += 1
    return expanded_versions


def extract_table_data(target_tables):
    rows = []
    for table in target_tables:
        for row in table.find_all("tr")[1:]:  # Skip the header row
            columns = row.find_all("td")
            if len(columns) >= 4:  # Ensure there are enough columns
                cert_manager_version = (
                    columns[0].get_text(strip=True).rstrip(" LTS") + ".0"
                )
                k8s_supported_versions = (
                    columns[3].get_text(strip=True).split(" / ")[0]
                )
                expanded_versions = expand_kube_versions(
                    k8s_supported_versions
                )
                version_info = OrderedDict(
                    [
                        ("version", cert_manager_version),
                        ("kube", expanded_versions),
                        ("requirements", []),
                        ("incompatibilities", []),
                    ]
                )
                rows.append(version_info)
    return rows


def scrape():
    url = "https://cert-manager.io/docs/releases/"
    page_content = fetch_page(url)
    if not page_content:
        return

    sections = parse_page(page_content)
    target_tables = find_target_tables(sections)
    if not target_tables:
        print_error("No target tables found in the README section.")
        return

    rows = extract_table_data(target_tables)
    update_compatibility_info(
        "../../static/compatibilities/cert-manager.yaml", rows
    )
    update_chart_versions("cert-manager")
