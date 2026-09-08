import re

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "kube-state-metrics"
MATRIX_URL = "https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/README.md"


def parse_matrix(content, chart_versions):
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    in_matrix = False
    versions = []
    for line in text.splitlines():
        line = line.strip()
        if line == "#### Compatibility matrix":
            in_matrix = True
            continue
        if not in_matrix:
            continue
        if line.startswith("#"):
            break
        cells = [cell.strip().strip("*`") for cell in line.strip("|").split("|")]
        if len(cells) != 2:
            continue
        app_version = validate_semver(cells[0].lstrip("v"))
        kube_match = re.fullmatch(r"v?(\d+\.\d+)", cells[1])
        if not app_version or not kube_match:
            continue
        chart_version = validate_semver(chart_versions.get(str(app_version), ""))
        if not chart_version:
            continue
        # Record the documented client-go pairing; broader compatibility is best effort.
        versions.append({
            "version": str(app_version),
            "kube": [kube_match.group(1)],
            "chart_version": str(chart_version),
            "requirements": [],
            "incompatibilities": [],
        })
    return versions


def scrape():
    content = fetch_page(MATRIX_URL)
    if not content:
        return
    versions = parse_matrix(content, get_chart_versions(APP_NAME))
    if not versions:
        print_error("No kube-state-metrics compatibility rows with stable Helm charts found.")
        return
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", versions)
