# scrapers/cert_manager.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
)

app_name = "istio"
compatibility_url = "https://istio.io/latest/docs/releases/supported-releases/"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if section.get_text(strip=True) in [
            "Support status of Istio releases",
        ]:
            table = section.find_next("table")
            if table:
                target_tables.append(table)
    return target_tables


def extract_table_data(target_tables, chart_versions):
    rows = []
    table = target_tables[0]
    for row in table.find_all("tr")[1:]:  # Skip the header row
        columns = row.find_all("td")
        if len(columns) >= 6:  # Ensure there are enough columns
            istio_version = validate_semver(columns[0].text)
            kube_versions = columns[4].text.split(", ")
            is_supported = columns[1].text
            if istio_version and is_supported.lower() == "yes":
                ver = str(istio_version)
                chart_version = chart_versions.get(ver)
                if not chart_version:
                    continue
                version_info = OrderedDict(
                    [
                        ("version", str(istio_version)),
                        ("kube", kube_versions),
                        ("chart_version", chart_version),
                        ("requirements", []),
                        ("incompatibilities", []),
                    ]
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
        chart_versions = get_chart_versions(app_name, "base")
        rows = extract_table_data(target_tables, chart_versions)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

