
from bs4 import BeautifulSoup
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    get_kube_release_info,
    get_github_releases_timestamps,
    find_last_n_releases,
    clean_kube_version,
    get_chart_versions,
)

app_name = "victoria-metrics-operator"

def scrape():
    kube_releases = get_kube_release_info()
    vm_releases = list(reversed(list(get_github_releases_timestamps("VictoriaMetrics", "operator"))))
    chart_versions = get_chart_versions(app_name)
    versions = []

    pruned_releases = [(r.lstrip("v"), ts) for r, ts in vm_releases if "-" not in r]
    for idx, vm_release in enumerate(pruned_releases):
        release_vsn = vm_release[0]
        future_release = vm_release
        if idx < len(pruned_releases) - 1:
            future_release = pruned_releases[idx + 1]
        compatible_kube_releases = find_last_n_releases(kube_releases, future_release[1], n=3)
        chart_version = chart_versions.get(release_vsn)
        if not chart_version:
            continue

        vsn = {
            "version": release_vsn,
            "kube": [clean_kube_version(kube_release[0]) for kube_release in compatible_kube_releases],
            "requirements": [],
            "chart_version": chart_version,
            "incompatibilities": [],
        }

        versions.append(vsn)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
