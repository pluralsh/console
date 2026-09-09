from __future__ import annotations

import re
from collections import OrderedDict

import requests
import yaml
from packaging.version import Version

from utils import (
    current_kube_version,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "volsync"
INDEX_URL = "https://backube.github.io/helm-charts/index.yaml"


def expand_kube_version(kube_constraint: str, max_kube: str) -> list[str]:
    """
    Expands semver constraint like '^1.20.0-0' into list of minor versions ['1.36', '1.35', ..., '1.20'].
    Caps maximum version at max_kube.
    """
    m = re.search(r"\^?1\.(\d+)", kube_constraint)
    if not m:
        return []
    min_minor = int(m.group(1))
    max_minor = int(max_kube.split(".")[1])

    return [f"1.{minor}" for minor in range(max_minor, min_minor - 1, -1)]


def parse_volsync_entries(content, max_kube: str) -> list[OrderedDict]:
    """
    Parses VolSync Helm chart index YAML and extracts valid compatibility entries.
    """
    try:
        data = yaml.safe_load(content)
    except Exception:
        return []

    entries = data.get("entries", {}).get(APP_NAME, [])
    versions_map = {}

    for entry in entries:
        ver_str = entry.get("version", "")
        # Filter out release candidates and prereleases
        if any(tag in ver_str.lower() for tag in ["-rc", "-alpha", "-beta"]):
            continue

        parsed = validate_semver(ver_str)
        if not parsed:
            continue

        kube_constraint = entry.get("kubeVersion", "^1.20.0-0")
        kube_list = expand_kube_version(kube_constraint, max_kube)
        if not kube_list:
            continue

        if ver_str not in versions_map:
            versions_map[ver_str] = OrderedDict(
                [
                    ("version", ver_str),
                    ("kube", kube_list),
                    ("chart_version", ver_str),
                    ("images", []),
                    (
                        "requirements",
                        [
                            OrderedDict(
                                [
                                    ("name", "CSI VolumeSnapshot"),
                                    (
                                        "description",
                                        "Requires a CSI driver with VolumeSnapshot support and a snapshot controller",
                                    ),
                                ]
                            )
                        ],
                    ),
                    ("incompatibilities", []),
                ]
            )

    sorted_entries = sorted(
        versions_map.values(),
        key=lambda v: Version(v["version"]),
        reverse=True,
    )
    return sorted_entries


def scrape():
    content = fetch_page(INDEX_URL)
    if not content:
        print_error("Failed to fetch VolSync Helm index")
        return

    max_kube = current_kube_version()
    rows = parse_volsync_entries(content, max_kube)
    if not rows:
        print_error("No VolSync compatibility rows generated")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml",
        rows,
    )


if __name__ == "__main__":
    scrape()
