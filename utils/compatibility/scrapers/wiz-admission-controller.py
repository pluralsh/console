import yaml
from collections import OrderedDict
from datetime import datetime

from utils import (
    fetch_page,
    find_last_n_releases,
    clean_kube_version,
    get_kube_release_info,
    print_error,
    print_success,
    print_warning,
    update_compatibility_info,
)

app_name = "wiz-admission-controller"
helm_repo_url = "https://wiz-sec.github.io/charts"
chart_name = "wiz-admission-controller"


def fetch_helm_index():
    """Fetch the Helm repository index.yaml."""
    url = f"{helm_repo_url}/index.yaml"
    content = fetch_page(url)
    if not content:
        return None
    return yaml.safe_load(content)


def get_chart_entries():
    """Get chart entries from the Helm index."""
    index = fetch_helm_index()
    if not index:
        return []
    
    entries = index.get("entries", {}).get(chart_name, [])
    return entries


def scrape():
    chart_entries = get_chart_entries()
    if not chart_entries:
        print_error(f"No chart entries found for {app_name}.")
        return

    kube_releases = get_kube_release_info()
    rows = []

    for entry in chart_entries:
        chart_version = entry.get("version", "").lstrip("v")
        app_version = entry.get("appVersion", "").lstrip("v")
        created_str = entry.get("created")

        if not chart_version or not app_version:
            continue

        if not created_str:
            print_warning(f"No creation timestamp for {chart_version}, skipping.")
            continue

        try:
            created_ts = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            print_warning(f"Could not parse timestamp for {chart_version}, skipping.")
            continue

        compatible_kube_releases = find_last_n_releases(kube_releases, created_ts, n=4)
        kube_versions = [clean_kube_version(kr[0]) for kr in compatible_kube_releases]

        if not kube_versions:
            print_warning(f"Could not determine K8s versions for {chart_version}, skipping.")
            continue

        rows.append(OrderedDict([
            ("version", app_version),
            ("kube", kube_versions),
            ("chart_version", chart_version),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
        print_success(f"Fetched compatibility info for {app_name} {app_version} (chart {chart_version})")

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
