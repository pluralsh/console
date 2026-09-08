import re

from bs4 import BeautifulSoup
from packaging.version import InvalidVersion, Version

from utils import fetch_page, get_chart_versions, print_error, update_compatibility_info


APP_NAME = "openkruise"
COMPATIBILITY_URL = "https://openkruise.io/docs/installation"


def parse_compatibility_matrix(content):
    """Keep only upstream's exact API matches (✓), not partial or untested pairs."""
    soup = BeautifulSoup(content, "html.parser")
    for table in soup.find_all("table"):
        header = table.find("tr")
        if header is None:
            continue
        columns = [cell.get_text(strip=True) for cell in header.find_all(["th", "td"])]
        if not columns or columns[0] != "Kruise Version":
            continue
        kube_versions = columns[1:]
        if not kube_versions or any(
            not re.fullmatch(r"\d+\.\d+", version) for version in kube_versions
        ):
            raise ValueError("Unexpected Kubernetes columns in OpenKruise matrix")

        matrix = {}
        for row in table.find_all("tr")[1:]:
            cells = [cell.get_text(strip=True) for cell in row.find_all(["th", "td"])]
            if len(cells) != len(columns):
                raise ValueError("Unexpected row length in OpenKruise matrix")
            family = re.fullmatch(r"(\d+\.\d+)\.x", cells[0])
            if family is None or any(mark not in {"✓", "+", "-", "?"} for mark in cells[1:]):
                raise ValueError("Unexpected release or compatibility mark in OpenKruise matrix")
            key = family.group(1)
            if key in matrix:
                raise ValueError("Duplicate release family in OpenKruise matrix")
            matrix[key] = [
                kube for kube, mark in zip(kube_versions, cells[1:]) if mark == "✓"
            ]
        if not matrix or not any(matrix.values()):
            raise ValueError("No exact API matches in OpenKruise matrix")
        return matrix

    raise ValueError("OpenKruise compatibility matrix not found")


def extract_table_data(matrix, chart_versions):
    rows = []
    for app_version, chart_version in chart_versions.items():
        try:
            version = Version(app_version)
            chart = Version(chart_version)
        except InvalidVersion:
            continue
        if version.is_prerelease or version.is_devrelease or chart.is_prerelease or chart.is_devrelease:
            continue
        kube_versions = matrix.get(f"{version.major}.{version.minor}")
        if not kube_versions:
            continue
        rows.append({
            "version": app_version,
            "kube": kube_versions,
            "chart_version": chart_version,
            "requirements": [],
            "incompatibilities": [],
        })
    return rows


def scrape():
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        return
    try:
        matrix = parse_compatibility_matrix(content)
    except ValueError as error:
        print_error(str(error))
        return
    rows = extract_table_data(matrix, get_chart_versions(APP_NAME))
    if not rows:
        print_error("No released OpenKruise charts match the compatibility matrix")
        return
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
