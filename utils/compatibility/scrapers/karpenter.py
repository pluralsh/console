from bs4 import BeautifulSoup
from collections import OrderedDict
from packaging.version import Version
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    validate_semver,
)

app_name = "karpenter"
compatibility_url = "https://karpenter.sh/preview/upgrading/compatibility/"


def find_compatibility_table(content):
    soup = BeautifulSoup(content, "html.parser")

    header = soup.find(id="compatibility-matrix")
    if header:
        table = header.find_next("table")
        if table:
            return table

    for h2 in soup.find_all("h2"):
        if "Compatibility Matrix" in h2.get_text(strip=True):
            table = h2.find_next("table")
            if table:
                return table

    return None


def parse_table(table):
    rows = table.find_all("tr")
    if len(rows) < 2:
        return {}

    kube_headers = [c.get_text(strip=True).lstrip("v") for c in rows[0].find_all(["th", "td"])][1:]
    requirements = [c.get_text(strip=True) for c in rows[1].find_all(["th", "td"])][1:]

    min_map = {}
    for kube, required in zip(kube_headers, requirements):
        normalized = required.replace(">=", "").replace("v", "").strip()
        semver = validate_semver(normalized)
        if semver:
            min_map[kube] = str(semver)

    return min_map


def extract_table_data(target_tables):
    if len(target_tables) < 2:
        print_error("Insufficient data in target tables.")
        return []

    version_sets = {}
    versions = sorted({v for v in min_map.values()}, key=lambda s: validate_semver(s))

    for ver in versions:
        ver_sem = validate_semver(ver)
        if not ver_sem:
            continue

        if kar_ver:
            ver = str(kar_ver)
            version_info = OrderedDict(
                {
                    "version": ver,
                    "kube": expanded_k8s_ver,
                    "chart_version": str(kar_ver),
                    "images": [],
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
    if len(target_tables) >= 1:
        rows = extract_table_data(target_tables)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

    table = find_compatibility_table(page_content)
    if table is None:
        print_error("No compatibility information found.")
        return

    page_rows = build_rows_from_table(table, chart_versions)
    if not page_rows:
        print_error("No compatibility information found.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", list(page_rows.values())
    )
