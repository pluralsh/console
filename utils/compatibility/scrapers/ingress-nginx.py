# scrapers/ingress_nginx.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import print_error, fetch_page, update_compatibility_info


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    readme_section = soup.find(
        "article", class_="markdown-body entry-content container-lg"
    )
    if not readme_section:
        print_error("Could not find the README section on the page.")
        return None
    return readme_section


def extract_table_data(table):
    rows = []
    for row in table.find_all("tr")[1:]:  # Skip the header row
        columns = row.find_all("td")
        if len(columns) >= 3:  # Ensure there are enough columns
            ingress_nginx_version = columns[1].get_text(strip=True).lstrip("v")
            k8s_supported_versions = (
                columns[2].get_text(strip=True).split(", ")
            )
            version_info = OrderedDict(
                [
                    ("version", ingress_nginx_version),
                    ("kube", k8s_supported_versions),
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

    readme_section = parse_page(page_content)
    if not readme_section:
        return

    table = readme_section.find("table")
    if not table:
        print_error("No table found in the README section.")
        return

    rows = extract_table_data(table)
    update_compatibility_info(
        "../../static/compatibilities/ingress-nginx.yaml", rows
    )
