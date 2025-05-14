from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
)


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    supported_versions_section = soup.find(
        "h3", text="Supported Versions table"
    )
    if not supported_versions_section:
        print_error("Could not find the 'Supported Versions table' section.")
        return None

    table = supported_versions_section.find_next("table")
    if not table:
        print_error(
            "Could not find the table 'Supported Versions table' section."
        )
        return None
    return table


def clean_versions(versions):
    clean_list = []
    for version in versions:
        version = version.replace(
            "\xa0", " "
        ).strip()  # Replace non-breaking space with a normal space and strip
        clean_list.extend(
            version.split(", ")
        )  # Split by comma and space and extend the list
    return clean_list


def extract_table_data(table, chart_versions):
    rows = []
    for row in table.find_all("tr")[1:]:  # Skip the header row
        columns = row.find_all("td")
        if len(columns) >= 3:  # Ensure there are enough columns
            ingress_nginx_version = columns[1].get_text(strip=True).lstrip("v")
            k8s_supported_versions = clean_versions(
                columns[2].get_text(strip=True).split(", ")
            )

            ingress_nginx_version = validate_semver(ingress_nginx_version)
            if not ingress_nginx_version:
                continue
            ver = str(ingress_nginx_version)
            chart_version = chart_versions.get(ver)
            if not chart_version:
                continue

            version_info = OrderedDict(
                [
                    ("version", ver),
                    ("kube", k8s_supported_versions),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
            rows.append(version_info)
    return rows


def scrape():
    url = "https://github.com/kubernetes/ingress-nginx"
    page_content = fetch_page(url)
    if not page_content:
        return

    table = parse_page(page_content)
    if not table:
        return

    chart_versions = get_chart_versions("ingress-nginx")
    rows = extract_table_data(table, chart_versions)
    update_compatibility_info(
        "../../static/compatibilities/ingress-nginx.yaml", rows
    )
