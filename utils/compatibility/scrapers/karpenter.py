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


def build_rows_from_table(table, chart_versions):
    min_map = parse_table(table)
    if not min_map:
        return {}

    version_sets = {}
    versions = sorted({v for v in min_map.values()}, key=lambda s: validate_semver(s))

    for ver in versions:
        ver_sem = validate_semver(ver)
        if not ver_sem:
            continue

        kube_versions = []
        for kube, required in min_map.items():
            req_sem = validate_semver(required)
            if req_sem and req_sem <= ver_sem:
                kube_versions.append(kube)

        if kube_versions:
            version_sets.setdefault(ver, set()).update(kube_versions)

    rows = {}
    for ver, kube_set in version_sets.items():
        chart_version = chart_versions.get(ver)
        kube_sorted = sorted(kube_set, key=lambda k: Version(k), reverse=True)
        rows[ver] = OrderedDict(
            {
                "version": ver,
                "kube": kube_sorted,
                **({"chart_version": chart_version} if chart_version else {}),
                "requirements": [],
                "incompatibilities": [],
            }
        )

    return rows


def scrape():

    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    chart_versions = get_chart_versions(app_name)

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
