# scrapers/cert_manager.py

from collections import OrderedDict

from utils import (
    print_error,
    update_compatibility_info,
    get_chart_versions,
    print_success,
    get_kube_release_info,
    get_github_releases_timestamps,
    find_last_n_releases,
    clean_kube_version,
)

app_name = "argo-rollouts"
def scrape():
    kube_releases = get_kube_release_info()
    argo_releases = list(
        reversed(list(get_github_releases_timestamps("argoproj", "argo-rollouts")))
    )
    chart_versions = get_chart_versions(app_name)
    rows = []
    pruned_releases = [(r.lstrip("v"), ts) for r, ts in argo_releases if "-" not in r]
    if not pruned_releases:
        print_error("No release tags found.")
        return

    for idx, argo_release in enumerate(pruned_releases):
        release_vsn = argo_release[0]
        future_release = argo_release
        if idx < len(pruned_releases) - 1:
            future_release = pruned_releases[idx + 1]
        compatible_kube_releases = find_last_n_releases(
            kube_releases, future_release[1], n=3
        )
        chart_version = chart_versions.get(release_vsn)
        # Skip if there's no chart version mapped
        if not chart_version:
            continue

        kube_versions = [
            clean_kube_version(kube_release[0])
            for kube_release in compatible_kube_releases
        ]
        kube_versions = [vsn for vsn in kube_versions if vsn]

        rows.append(
            OrderedDict(
                [
                    ("version", release_vsn),
                    ("kube", kube_versions),
                    ("chart_version", chart_version),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
        print_success(f"Derived compatibility info for release: {release_vsn}")

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
