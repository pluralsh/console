import re

import yaml
from semantic_version import NpmSpec, Version

from utils import (
    current_kube_version,
    fetch_page,
    print_error,
    sort_versions,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "trust-manager"
INDEX_URL = "https://charts.jetstack.io/index.yaml"


def parse_index(content, latest_kube):
    index = yaml.safe_load(content)
    entries = index.get("entries", {}).get(APP_NAME, [])
    latest = Version.coerce(latest_kube)
    kube_releases = [
        Version(major=latest.major, minor=minor, patch=0)
        for minor in range(latest.minor + 1)
    ]
    versions = []
    for entry in entries:
        app_version = validate_semver(entry.get("appVersion", "").lstrip("v"))
        chart_version = validate_semver(entry.get("version", "").lstrip("v"))
        constraint = entry.get("kubeVersion")
        # Older charts without a declared constraint do not establish compatibility.
        if not app_version or not chart_version or not constraint:
            continue
        spec = NpmSpec(re.sub(r"([<>=~^]+)\s+", r"\1", constraint))
        kube = [f"{v.major}.{v.minor}" for v in kube_releases if spec.match(v)]
        if kube:
            versions.append({
                "version": str(app_version),
                "kube": kube,
                "chart_version": str(chart_version),
                "requirements": [],
                "incompatibilities": [],
            })

    # Index order is not guaranteed; prefer the newest stable chart per app version.
    result = {}
    for version in sort_versions(versions):
        result.setdefault(version["version"], version)
    return list(result.values())


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return
    content = fetch_page(INDEX_URL)
    if not content:
        return
    versions = parse_index(content, latest_kube)
    if not versions:
        print_error("No declared Kubernetes compatibility found for trust-manager.")
        return
    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", versions
    )
