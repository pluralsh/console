"""Join Volcano's published release-family matrix to stable Helm releases."""

import re
from collections import OrderedDict

import requests

from utils import get_chart_versions, update_compatibility_info

APP_NAME = "volcano"
TARGET_FILE = "../../static/compatibilities/volcano.yaml"
README_URL = "https://raw.githubusercontent.com/volcano-sh/volcano/master/README.md"
STABLE_VERSION = re.compile(r"\d+\.\d+\.\d+")


def parse_kube_versions(content, version):
    """Only a check mark denotes exact compatibility; neither +/- nor HEAD does."""
    if not STABLE_VERSION.fullmatch(version):
        raise ValueError(f"Invalid stable Volcano version: {version!r}")
    family = ".".join(version.split(".")[:2])
    target = f"Volcano v{family}"
    headers = None
    matches = []
    for line in content.splitlines():
        if not line.strip().startswith("|"):
            headers = None
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) > 1 and any(cell.startswith("Kubernetes ") for cell in cells[1:]):
            headers = []
            for cell in cells[1:]:
                match = re.fullmatch(r"Kubernetes (\d+\.\d+)", cell)
                if not match:
                    raise ValueError(f"Invalid Kubernetes column: {cell!r}")
                headers.append(match.group(1))
            if len(headers) != len(set(headers)):
                raise ValueError("Duplicate Kubernetes columns")
        elif cells[0] == target and headers is not None:
            if len(cells) != len(headers) + 1:
                raise ValueError(f"Incomplete Volcano compatibility row for {version}")
            if any(cell not in {"✓", "+", "-"} for cell in cells[1:]):
                raise ValueError(f"Unknown compatibility marker for {version}")
            matches.append([kube for kube, marker in zip(headers, cells[1:]) if marker == "✓"])
    if len(matches) != 1 or not matches[0]:
        raise ValueError(f"Expected one nonempty exact-compatibility row for {version}")
    return sorted(matches[0], key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def collect_versions(content, chart_versions):
    families = set(re.findall(r"^\|\s*Volcano v(\d+\.\d+)\s*\|", content, re.MULTILINE))
    if not families:
        raise ValueError("No published Volcano release-family rows found")
    # Validate every family before joining; malformed docs must not silently
    # replace a previously complete table with a subset.
    compatibility = {family: parse_kube_versions(content, f"{family}.0") for family in families}
    rows = []
    for version, chart in chart_versions.items():
        # Some historical charts advertise appVersion 0.1. Do not infer an
        # application release from a chart version or from development metadata.
        if not STABLE_VERSION.fullmatch(version) or not STABLE_VERSION.fullmatch(chart):
            continue
        family = ".".join(version.split(".")[:2])
        if family not in compatibility:
            continue
        rows.append(OrderedDict([
            ("version", version),
            ("kube", compatibility[family]),
            ("chart_version", chart),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    if not rows:
        raise ValueError("No released Volcano charts match the published compatibility matrix")
    return sorted(rows, key=lambda row: tuple(map(int, row["version"].split("."))), reverse=True)


def scrape():
    # Collect and validate every source before touching the existing table.
    response = requests.get(README_URL, timeout=30)
    response.raise_for_status()
    rows = collect_versions(response.text, get_chart_versions(APP_NAME))
    update_compatibility_info(TARGET_FILE, rows)
