# scrapers/argo-cd.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
)

app_name = "argo-cd"
compatibility_url = "https://argo-cd.readthedocs.io/en/stable/operator-manual/tested-kubernetes-versions/"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h1")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if section.get_text(strip=True) in [
            "Tested kubernetes versions",
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
        if len(columns) >= 2:  # Ensure there are enough columns
            argocd_version = validate_semver(columns[0].text)
            kube_versions = columns[1].text.split(", ")
            if argocd_version:
                ver = str(argocd_version)
                chart_version = chart_versions.get(ver)
                if not chart_version:
                    continue
                version_info = OrderedDict(
                    [
                        ("version", str(argocd_version)),
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
        chart_versions = get_chart_versions(app_name, "argo-cd")
        rows = extract_table_data(target_tables, chart_versions)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

