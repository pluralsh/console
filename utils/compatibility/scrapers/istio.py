# scrapers/cert_manager.py

from bs4 import BeautifulSoup
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
)

app_name = "istio"
compatibility_url = "https://istio.io/latest/docs/releases/supported-releases/"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    return target_tables


def extract_table_data(target_tables):
    rows = []
    return rows


def scrape():

    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    sections = parse_page(page_content)
    target_tables = find_target_tables(sections)
    if target_tables.__len__() >= 1:
        rows = extract_table_data(target_tables)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

    update_chart_versions(app_name, "base")
