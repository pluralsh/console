from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
)

app_name = "app"
compatibility_url = "https://plural.sh"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if section.get_text(strip=True) in [
            "Header Title",
        ]:
            table = section.find_next("table")
            if table:
                target_tables.append(table)
    return target_tables


def extract_table_data(target_tables, chart_versions):
    rows = []
    for row in target_tables[0].find_all("tr")[1:]:  # Skip the header row
        columns = row.find_all("td")
        app_version = validate_semver(columns[0].text)
        kube_versions = columns[2].get_text(strip=True).split(", ")
        if app_version:
            ver = str(app_version)
            chart_version = chart_versions.get(ver)
            if not chart_version:
                continue
            version_info = OrderedDict(
                [
                    ("version", ver),
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
        chart_versions = get_chart_versions(app_name)
        rows = extract_table_data(target_tables, chart_versions)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

