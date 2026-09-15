import re
from collections import OrderedDict

from packaging.version import Version

from utils import fetch_page, get_chart_versions, print_error, update_compatibility_info


APP_NAME = "kube-state-metrics"
COMPATIBILITY_URL = (
    "https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/README.md"
)
IMAGE_REPOSITORY = "registry.k8s.io/kube-state-metrics/kube-state-metrics"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(cell):
    return cell.strip().strip("`").replace("*", "")


def parse_compatibility_matrix(content):
    """Return the exact release -> Kubernetes/client-go mappings upstream publishes."""
    rows = OrderedDict()
    in_matrix = False

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if stripped == "#### Compatibility matrix":
            in_matrix = True
            continue
        if in_matrix and stripped.startswith("#### "):
            break
        if not in_matrix or "|" not in stripped:
            continue

        columns = [_clean_cell(cell) for cell in stripped.strip("|").split("|")]
        if len(columns) != 2:
            continue
        if "kube-state-metrics" in columns[0].lower():
            continue
        if set(columns[0] + columns[1]) <= {"-", ":"}:
            continue

        app_match = re.fullmatch(r"v?(\d+\.\d+\.\d+)", columns[0])
        kube_match = re.fullmatch(r"v?(\d+\.\d+)", columns[1])
        if not app_match or not kube_match:
            # Ignore the moving `main` row and any non-release documentation rows.
            continue

        rows[app_match.group(1)] = [kube_match.group(1)]

    if not rows:
        print_error("No kube-state-metrics compatibility matrix rows found.")
    return rows


def extract_table_data(compatibility_matrix, chart_versions):
    rows = []
    for app_version, kube_versions in compatibility_matrix.items():
        chart_version = chart_versions.get(app_version)
        if not chart_version:
            continue
        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_version),
                    ("images", [f"{IMAGE_REPOSITORY}:v{app_version}"]),
                ]
            )
        )

    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    page_content = fetch_page(COMPATIBILITY_URL)
    if not page_content:
        return

    compatibility_matrix = parse_compatibility_matrix(page_content)
    chart_versions = get_chart_versions(APP_NAME)
    rows = extract_table_data(compatibility_matrix, chart_versions)
    if not rows:
        print_error("No kube-state-metrics versions matched published Helm charts.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
