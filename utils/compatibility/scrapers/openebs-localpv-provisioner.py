"""OpenEBS LocalPV compatibility from its release-family matrix and Helm index."""

import re

import yaml

from utils import current_kube_version, fetch_page, print_error, update_compatibility_info


APP_NAME = "openebs-localpv-provisioner"
CHART_NAME = "localpv-provisioner"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
MATRIX_URL = "https://raw.githubusercontent.com/openebs/dynamic-localpv-provisioner/develop/README.md"
INDEX_URL = "https://openebs.github.io/dynamic-localpv-provisioner/index.yaml"


def _stable_version(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", str(value))
    return tuple(map(int, match.groups())) if match else None


def _kube_versions(header, latest_kube):
    """Expand only an explicitly supported column, capped at known Kubernetes."""
    latest = re.fullmatch(r"1\.(\d+)", latest_kube or "")
    if not latest:
        raise ValueError("KUBE_VERSION must contain a Kubernetes 1.x minor version")
    limit = int(latest.group(1))
    header = re.sub(r"[\s`()]+", "", header).removeprefix("Kubernetes")
    bounded = re.fullmatch(r"v?1\.(\d+)-v?1\.(\d+)", header)
    lower = re.fullmatch(r">=v?1\.(\d+)", header)
    upper = re.fullmatch(r"<=v?1\.(\d+)", header)
    if bounded:
        start, end = map(int, bounded.groups())
        if end < start:
            raise ValueError(f"Reversed Kubernetes range: {header}")
    elif lower:
        start, end = int(lower.group(1)), limit
    elif upper:
        start, end = 0, int(upper.group(1))
    else:
        raise ValueError(f"Unrecognized Kubernetes matrix column: {header}")
    return [f"1.{minor}" for minor in range(start, min(end, limit) + 1)]


def parse_matrix(content, latest_kube):
    """Return supported Kubernetes minors by documented application release family."""
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    section = re.search(
        r"^## Kubernetes Compatibility Matrix\s*\n(.*?)(?=^## |\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if not section:
        raise ValueError("Kubernetes Compatibility Matrix section was not found")
    lines = [line.strip() for line in section.group(1).splitlines() if line.strip().startswith("|")]
    if len(lines) < 3:
        raise ValueError("Kubernetes compatibility table is empty")
    cells = lambda line: [cell.strip().strip("`") for cell in line.strip("|").split("|")]
    headers = cells(lines[0])
    columns = [_kube_versions(header, latest_kube) for header in headers[1:]]
    families = {}
    for line in lines[2:]:
        row = cells(line)
        if len(row) != len(headers):
            raise ValueError("Kubernetes matrix row has the wrong number of columns")
        if row[0] == "HEAD":
            continue  # The development branch is not a released application version.
        family = re.fullmatch(r"v?(\d+)\.(\d+)\.x", row[0])
        if not family:
            raise ValueError(f"Unrecognized application release family: {row[0]}")
        key = tuple(map(int, family.groups()))
        if key in families:
            raise ValueError(f"Duplicate application release family: {row[0]}")
        supported = set()
        for status, versions in zip(row[1:], columns):
            if status == "✓":
                supported.update(versions)
            elif status != "✕":
                raise ValueError(f"Unrecognized compatibility indicator: {status}")
        families[key] = sorted(supported, key=lambda v: int(v.split(".")[1]), reverse=True)
    if not families:
        raise ValueError("No released application families found in the matrix")
    return families


def build_versions(matrix, index_content, latest_kube):
    families = parse_matrix(matrix, latest_kube)
    index = yaml.safe_load(index_content)
    all_entries = index.get("entries") if isinstance(index, dict) else None
    entries = all_entries.get(CHART_NAME, []) if isinstance(all_entries, dict) else []
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"No {CHART_NAME} entries in the official Helm index")
    charts = {}
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("deprecated"):
            continue
        app = _stable_version(entry.get("appVersion"))
        chart = _stable_version(entry.get("version"))
        if not app or not chart or not families.get(app[:2]):
            continue
        # Choose the latest stable chart per app version, independent of index order.
        if app not in charts or chart > charts[app]:
            charts[app] = chart
    if not charts:
        raise ValueError("No stable charts matched documented release families")
    return [
        {
            "version": ".".join(map(str, app)),
            "kube": families[app[:2]],
            "requirements": [],
            "incompatibilities": [],
            "chart_version": ".".join(map(str, charts[app])),
        }
        for app in sorted(charts, reverse=True)
    ]


def scrape():
    try:
        matrix = fetch_page(MATRIX_URL)
        index = fetch_page(INDEX_URL)
        if not matrix or not index:
            raise ValueError("Could not fetch the official matrix and Helm index")
        versions = build_versions(matrix, index, current_kube_version())
    except (ValueError, TypeError, yaml.YAMLError) as error:
        print_error(f"Unable to generate {APP_NAME} compatibility: {error}")
        return
    update_compatibility_info(TARGET_FILE, versions)
