from bs4 import BeautifulSoup
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
)
from collections import OrderedDict
import os
import re

app_name = "linkerd"
docs_root_url = "https://linkerd.io/docs/"


def fetch_latest_docs_version() -> str | None:
    override = os.getenv("LINKERD_DOC_VERSION")
    if override:
        return override.strip().lstrip("v")

    content = fetch_page(docs_root_url)
    if not content:
        print_error("Failed to fetch Linkerd docs landing page.")
        return None

    text = content.decode("utf-8", errors="replace")
    patterns = [
        r"url=/(\d+\.\d+)/getting-started/",
        r'window.location.href="/(\d+\.\d+)/',
        r'<option value=/(\d+\.\d+)/ selected',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    for table in soup.find_all("table"):
        headers = [
            th.get_text(strip=True).lower() for th in table.find_all("th")
        ]
        if (
            "linkerd version" in headers
            and "minimum kubernetes version" in headers
        ):
            return table
    return None


def normalize_kube_minor(value: str) -> str | None:
    match = re.search(r"(\d+)\.(\d+)", value)
    if not match:
        return None
    return f"{int(match.group(1))}.{int(match.group(2))}"


def build_kube_range(min_version: str, max_version: str) -> list[str]:
    min_major, min_minor = (int(v) for v in min_version.split("."))
    max_major, max_minor = (int(v) for v in max_version.split("."))
    versions = []
    major, minor = min_major, min_minor
    while (major, minor) <= (max_major, max_minor):
        versions.append(f"{major}.{minor}")
        minor += 1
    return versions


def extract_table_data(table):
    rows = []
    for row in table.find_all("tr")[1:]:
        cols = [col.get_text(strip=True) for col in row.find_all("td")]
        if len(cols) < 3:
            continue
        linkerd_version = cols[0].lstrip("v")
        min_kube = normalize_kube_minor(cols[1])
        max_kube = normalize_kube_minor(cols[2])
        if not (linkerd_version and min_kube and max_kube):
            continue
        kube_versions = build_kube_range(min_kube, max_kube)
        rows.append(
            OrderedDict(
                [
                    ("version", linkerd_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def scrape():

    doc_version = fetch_latest_docs_version()
    if not doc_version:
        print_error("Could not determine latest Linkerd docs version.")
        return

    compatibility_url = (
        f"https://linkerd.io/{doc_version}/reference/k8s-versions"
    )
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    table = parse_page(page_content)
    if not table:
        print_error("No compatibility table found.")
        return

    rows = extract_table_data(table)
    if not rows:
        print_error("No compatibility information found.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
