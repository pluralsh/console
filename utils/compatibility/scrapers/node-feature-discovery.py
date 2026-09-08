import re

from utils import (
    current_kube_version,
    fetch_page,
    get_chart_versions,
    print_warning,
    update_compatibility_info,
    validate_semver,
)

app_name = "node-feature-discovery"
deployment_url = (
    "https://raw.githubusercontent.com/kubernetes-sigs/node-feature-discovery/"
    "v{version}/docs/deployment/index.md"
)


def documented_versions(page, current):
    """Expand the tagged deployment minimum, bounded by Plural's KUBE_VERSION."""
    text = page.decode("utf-8") if isinstance(page, bytes) else page
    match = re.search(
        r"Node Feature Discovery can be deployed on any recent version of "
        r"Kubernetes\s+\(v(\d+\.\d+)\+\)", text
    )
    if not match:
        return []
    minimum = match.group(1)
    if not re.fullmatch(r"1\.\d+", current) or not minimum.startswith("1."):
        raise ValueError("Unsupported Kubernetes major version")
    start, end = int(minimum.split(".")[1]), int(current.split(".")[1])
    if start > end:
        raise ValueError(f"NFD minimum {minimum} is newer than Plural {current}")
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def scrape():
    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")
    versions = []
    for version, chart in get_chart_versions(app_name).items():
        if not validate_semver(version) or not validate_semver(chart):
            continue
        page = fetch_page(deployment_url.format(version=version))
        kube = documented_versions(page, current) if page else []
        if not kube:
            print_warning(f"Skipping NFD {version}: no tagged Kubernetes minimum")
            continue
        versions.append({"version": version, "kube": kube, "chart_version": chart})
    if not versions:
        raise ValueError("No documented Node Feature Discovery releases found")
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )
