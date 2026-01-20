import re
import yaml
from collections import OrderedDict

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "rabbitmq-cluster-operator"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
INDEX_URL = "https://charts.bitnami.com/bitnami/index.yaml"


def parse_kube_range(spec, latest_kube):
    if not spec:
        return None

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

        if not op or op in (">", ">="):
            if min_major is None or (major, minor) > (min_major, min_minor):
                min_major, min_minor = major, minor
        elif op in ("<", "<="):
            if op == "<":
                minor -= 1
                if minor < 0:
                    continue
            if max_major is None or (major, minor) < (max_major, max_minor):
                max_major, max_minor = major, minor

    if min_major is None:
        return None

    if max_major is None:
        latest_major, latest_minor = latest_kube.split(".")
        max_major = int(latest_major)
        max_minor = int(latest_minor)

    return f"{min_major}.{min_minor}", f"{max_major}.{max_minor}"


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    content = fetch_page(INDEX_URL)
    if not content:
        print_error("Failed to fetch Bitnami index.yaml.")
        return

    try:
        index_yaml = yaml.safe_load(content)
    except Exception as e:
        print_error(f"Failed to parse Bitnami index.yaml: {e}")
        return

    entries = index_yaml.get("entries", {}).get(APP_NAME, [])
    if not entries:
        print_error("No chart entries found for rabbitmq-cluster-operator.")
        return

    versions: list[OrderedDict] = []
    seen = set()
    for entry in entries:
        app_version_raw = entry.get("appVersion", "").lstrip("v")
        app_version = validate_semver(app_version_raw)
        if not app_version:
            continue

        version = str(app_version)
        if version in seen:
            continue

        kube_spec = entry.get("kubeVersion")
        bounds = parse_kube_range(kube_spec, latest_kube)
        if not bounds:
            continue

        kube_min, kube_max = bounds
        kube_versions = expand_kube_versions(kube_min, kube_max)
        if not kube_versions:
            continue

        chart_version = entry.get("version", "").lstrip("v")
        if not chart_version:
            continue

        seen.add(version)
        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_version),
                ]
            )
        )

    if not versions:
        print_error("No compatibility data extracted from chart index.")
        return

    update_compatibility_info(TARGET_FILE, versions)
