import re
from collections import OrderedDict

from packaging.version import Version

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
)


APP_NAME = "metrics-server"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/kubernetes-sigs/metrics-server/master/README.md"
LOW_KUBE_REQUIREMENT = (
    "Kubernetes versions lower than v1.16 require "
    "--authorization-always-allow-paths=/livez,/readyz."
)


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(cell):
    return cell.strip().strip("`").replace("*", "")


def _parse_kube_versions(expr):
    expr = _clean_cell(expr).replace(" ", "").lstrip("v")
    if expr.endswith("+"):
        return expand_kube_versions(expr[:-1], current_kube_version())
    if "-" in expr:
        start, end = expr.split("-", 1)
        return expand_kube_versions(start.lstrip("v"), end.lstrip("v"))
    return [expr]


def parse_compatibility_matrix(content):
    rows = {}
    in_matrix = False

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if stripped == "### Compatibility Matrix":
            in_matrix = True
            continue
        if in_matrix and stripped.startswith("### "):
            break
        if not in_matrix or "|" not in stripped:
            continue
        if set(stripped.replace("|", "").strip()) <= {"-"}:
            continue

        columns = [
            _clean_cell(column)
            for column in stripped.strip("|").split("|")
        ]
        if len(columns) != 3 or columns[0] == "Metrics Server":
            continue

        version_match = re.match(r"^(\d+\.\d+)\.x$", columns[0])
        if not version_match:
            continue
        rows[version_match.group(1)] = _parse_kube_versions(columns[2])

    if not rows:
        print_error("No metrics-server compatibility matrix rows found.")
    return rows


def _requirements_for(kube_versions):
    if any(Version(version) < Version("1.16") for version in kube_versions):
        return [LOW_KUBE_REQUIREMENT]
    return []


def extract_table_data(compatibility_matrix, chart_versions):
    rows = []

    for app_version, chart_version in chart_versions.items():
        parsed_version = Version(app_version)
        minor_key = f"{parsed_version.major}.{parsed_version.minor}"
        kube_versions = compatibility_matrix.get(minor_key)
        if not kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", _requirements_for(kube_versions)),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape():
    page_content = fetch_page(COMPATIBILITY_URL)
    if not page_content:
        return

    compatibility_matrix = parse_compatibility_matrix(page_content)
    chart_versions = get_chart_versions(APP_NAME)
    rows = extract_table_data(compatibility_matrix, chart_versions)
    if not rows:
        print_error("No metrics-server versions extracted from compatibility matrix.")
        return
    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
