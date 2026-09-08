from __future__ import annotations

from utils import (
    get_github_releases_timestamps,
    get_kube_release_info,
    find_last_n_releases,
    update_compatibility_info,
    clean_kube_version,
    get_chart_versions,
)

app_name = "crossplane"


def scrape():
    kube_releases = get_kube_release_info()
    crossplane_releases = list(
        reversed(list(get_github_releases_timestamps("crossplane", "crossplane")))
    )

    chart_versions = get_chart_versions(app_name)
    versions = []
    for cp_release in crossplane_releases:
        if "-" in cp_release[0]:
            continue
        release_vsn = cp_release[0].replace("v", "")
        compatible_kube_releases = find_last_n_releases(kube_releases, cp_release[1], n=3)
        chart_version = chart_versions.get(release_vsn)
        if not chart_version:
            continue
        vsn = {
            "version": release_vsn,
            "kube": [clean_kube_version(kube_release[0]) for kube_release in compatible_kube_releases],
            "chart_version": chart_version,
            "requirements": [],
            "incompatibilities": [],
        }
        versions.append(vsn)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
