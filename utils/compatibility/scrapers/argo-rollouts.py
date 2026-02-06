from utils import (
    update_compatibility_info,
    get_kube_release_info,
    get_github_releases_timestamps,
    find_last_n_releases,
    clean_kube_version,
    get_chart_versions,
)

app_name = "argo-rollouts"

def scrape():
    kube_releases = get_kube_release_info()
    argo_releases = list(reversed(list(get_github_releases_timestamps("argoproj", "argo-rollouts"))))
    chart_versions = get_chart_versions(app_name)
    versions = []

    pruned_releases = [(r.lstrip("v"), ts) for r, ts in argo_releases if "-" not in r]
    for idx, argo_release in enumerate(pruned_releases):
        release_vsn = argo_release[0]
        future_release = argo_release
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
            "images": [],
            "incompatibilities": [],
        }

        versions.append(vsn)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
