from bs4 import BeautifulSoup
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
)
import re

app_name = "coredns"
compatibility_url = "https://github.com/coredns/deployment/blob/master/kubernetes/CoreDNS-k8s_version.md"  # noqa


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    table = soup.find("table")
    return table


def extract_table_data(table, chart_versions):
    rows = []
    table_rows = table.find_all("tr")
    for row in table_rows[1:]:  # Skip header row
        cols = row.find_all("td")
        kubernetes_versions = cols[0].text.strip()
        coredns_version = cols[1].text.strip()

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

        rows.append(
            {"version": coredns_version, "kube": kubernetes_versions_list, "chart_version": chart_version}
        )
    return rows


def scrape():
    page_content = fetch_page(compatibility_url)
    if not page_content:
        print_error("Failed to fetch page content.")
        return

    tables = parse_page(page_content)
    if not tables:
        print_error("No tables found in the page content.")
        return

    chart_versions = get_chart_versions(app_name)
    rows = extract_table_data(tables, chart_versions)
    if not rows:
        print_error("No compatibility information found.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )

