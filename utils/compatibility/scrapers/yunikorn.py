import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import fetch_page, get_chart_versions, update_compatibility_info, validate_semver


APP_NAME = "yunikorn"
SUPPORT_URL = "https://yunikorn.apache.org/docs/get_started/version/"


def parse_support_ranges(content):
    soup = BeautifulSoup(content, "html.parser")
    for table in soup.find_all("table"):
        headers = [cell.get_text(" ", strip=True) for cell in table.find_all("th")]
        if headers != ["K8s Version", "Supported from version", "Support ended"]:
            continue

        ranges = []
        for row in table.find_all("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
            if not cells:
                continue
            if len(cells) != 3:
                raise ValueError(f"Unexpected YuniKorn support row: {cells}")
            kube, start, end = cells
            if start == end == "-":
                continue  # The upstream table explicitly marks these versions unsupported.
            match = re.fullmatch(r"(\d+\.\d+)\.x", kube)
            first = validate_semver(start)
            last = None if end == "-" else validate_semver(end)
            if not match or first is None or (end != "-" and last is None):
                raise ValueError(f"Invalid YuniKorn support range: {cells}")
            if last is not None and last < first:
                raise ValueError(f"Reversed YuniKorn support range: {cells}")
            ranges.append((match.group(1), first, last))

        if ranges:
            return ranges
    raise ValueError("YuniKorn Kubernetes support table is missing or empty")


def build_rows(chart_versions, support_ranges):
    rows = []
    for app_version, chart_version in chart_versions.items():
        version = validate_semver(app_version)
        if version is None or validate_semver(chart_version) is None:
            continue
        # "Support ended" is inclusive: the 1.3.0 release announcement explicitly
        # identifies 1.3.0 as the last release supporting Kubernetes 1.21-1.23.
        kube = [
            kube_version
            for kube_version, first, last in support_ranges
            if first <= version and (last is None or version <= last)
        ]
        if kube:
            rows.append(OrderedDict([
                ("version", str(version)),
                ("kube", kube),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]))
    return rows


def scrape():
    content = fetch_page(SUPPORT_URL)
    if not content:
        raise ValueError("Failed to fetch YuniKorn Kubernetes support table")
    ranges = parse_support_ranges(content)
    charts = get_chart_versions(APP_NAME)
    rows = build_rows(charts, ranges)
    if not rows:
        raise ValueError("No stable YuniKorn charts match the support table")
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
