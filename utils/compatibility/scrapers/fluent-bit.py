from __future__ import annotations

from utils import (
    clean_kube_version,
    find_last_n_releases,
    get_chart_versions,
    get_github_releases_timestamps,
    get_kube_release_info,
    update_compatibility_info,
)

app_name = "fluent-bit"
chart_name = "fluent-bit"


def scrape():
    kube_releases = get_kube_release_info()
    fluent_releases = list(
        reversed(list(get_github_releases_timestamps("fluent", "fluent-bit")))
    )

    chart_versions = get_chart_versions(app_name, chart_name)
    versions = []
    pruned_releases = [
        (r[0].lstrip("v"), r[1])
        for r in fluent_releases
        if "-" not in r[0]
        and not any(pre in r[0].lower() for pre in ["rc", "alpha", "beta"])
    ]
    for idx, fluent_release in enumerate(pruned_releases):
        release_vsn = fluent_release[0]
        future_release = fluent_release
        if idx < len(pruned_releases) - 1:
            future_release = pruned_releases[idx + 1]

        compatible_kube_releases = find_last_n_releases(
            kube_releases, future_release[1], n=3
        )
        chart_version = chart_versions.get(release_vsn)
        if not chart_version:
            continue
        vsn = {
            "version": release_vsn,
            "kube": [
                clean_kube_version(kube_release[0])
                for kube_release in compatible_kube_releases
                if clean_kube_version(kube_release[0])
            ],
            "chart_version": chart_version,
            "requirements": [],
            "incompatibilities": [],
        }
        versions.append(vsn)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
