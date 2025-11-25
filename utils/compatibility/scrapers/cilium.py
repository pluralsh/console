# scrapers/cert_manager.py

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

app_name = "cilium"

def scrape():
    kube_releases = get_kube_release_info()
    cilium_releases = list(reversed(list(get_github_releases_timestamps("cilium", "cilium"))))

    chart_versions = get_chart_versions(app_name)
    versions = []
    for cilium_release in cilium_releases:
        if "-" in cilium_release[0]:
            continue
        release_vsn = cilium_release[0].replace("v", "")
        compatible_kube_releases = find_last_n_releases(kube_releases, cilium_release[1], n=3)
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
