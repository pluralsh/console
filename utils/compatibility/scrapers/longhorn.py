import re
import yaml
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    expand_kube_versions,
    current_kube_version,
    validate_semver,
)

APP_NAME = "longhorn"
INDEX_URL = "https://charts.longhorn.io/index.yaml"


def parse_kube_range(spec, latest_kube):
    """
    Parse a Helm kubeVersion constraint like:
      '>=1.25.0-0'
      '>=1.18.0-0 <1.25.0-0'
      '>= v1.16.0-0, < v1.22.0-0'

    and return a (min, max) inclusive pair of Kubernetes minor versions,
    e.g. ('1.25', '1.34').
    """
    if not spec:
        return None

    # Normalise whitespace and separators
    spec = spec.replace(",", " ")

    pattern = r"(>=|<=|<|>|=)?\s*v?(\d+)\.(\d+)"
    matches = re.findall(pattern, spec)

    if not matches:
        return None

    min_major = None
    min_minor = None
    max_major = None
    max_minor = None

    for op, maj_str, min_str in matches:
        major = int(maj_str)
        minor = int(min_str)

        # Treat missing operator as a lower bound
        if not op or op in (">", ">="):
            if min_major is None or (major, minor) > (min_major, min_minor):
                min_major, min_minor = major, minor
        elif op in ("<", "<="):
            # For '< 1.25', cap at 1.24
            if op == "<":
                minor -= 1
                if minor < 0:
                    continue
            if max_major is None or (major, minor) < (max_major, max_minor):
                max_major, max_minor = major, minor

    if min_major is None:
        return None

    if max_major is None:
        # No explicit upper bound: assume up to the latest known Kubernetes minor
        latest_major, latest_minor = latest_kube.split(".")
        max_major = int(latest_major)
        max_minor = int(latest_minor)

    return f"{min_major}.{min_minor}", f"{max_major}.{max_minor}"


def extract_versions(index_yaml, latest_kube):
    entries = index_yaml.get("entries", {})
    longhorn_entries = entries.get("longhorn", [])
    versions = []

    for entry in longhorn_entries:
        app_version_raw = entry.get("appVersion", "").lstrip("v")
        app_version = validate_semver(app_version_raw)
        if not app_version:
            continue

        kube_spec = entry.get("kubeVersion")
        bounds = parse_kube_range(kube_spec, latest_kube)
        if not bounds:
            continue

        kube_min, kube_max = bounds
        kube_versions = expand_kube_versions(kube_min, kube_max)

        chart_version = entry.get("version", "").lstrip("v")
        if not chart_version:
            continue

        version_info = OrderedDict(
            [
                ("version", str(app_version)),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    return versions


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    content = fetch_page(INDEX_URL)
    if not content:
        return

    try:
        index_yaml = yaml.safe_load(content)
    except Exception as e:
        print_error(f"Failed to parse Longhorn index.yaml: {e}")
        return

    rows = extract_versions(index_yaml, latest_kube)
    if not rows:
        print_error("No Longhorn versions extracted from index.yaml.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
