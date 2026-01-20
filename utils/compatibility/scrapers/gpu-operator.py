from bs4 import BeautifulSoup
from colorama import Fore
from utils import (
    print_error,
    print_success,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    get_kube_release_info,
    get_github_releases_timestamps,
    find_last_n_releases,
    clean_kube_version,
    get_chart_versions,
    get_chart_images,
    read_yaml,
    write_yaml,
    sort_versions,
)

app_name = "gpu-operator"
filepath = f"../../static/compatibilities/{app_name}.yaml"

def get_gpu_images(version, values=None):
    url = "https://nvidia.github.io/gpu-operator"
    # Base images from default template
    images = set(get_chart_images(url, app_name, version, values) or [])


    # Keep only items that ARE valid docker images (contain both repository and tag separators)
    filtered = [img for img in images if ":" in img and "/" in img]

    return sorted(filtered)


def scrape():
    kube_releases = get_kube_release_info()
    gpu_releases = list(reversed(list(get_github_releases_timestamps("NVIDIA", app_name))))
    chart_versions = get_chart_versions(app_name)
    versions = []

    data = read_yaml(filepath)
    helm_values = data.get("helm_values") if data else None


    pruned_releases = [(r.lstrip("v"), ts) for r, ts in gpu_releases if "-" not in r]
    for idx, gpu_release in enumerate(pruned_releases):
        release_vsn = gpu_release[0]
        future_release = gpu_release
        if idx < len(pruned_releases) - 1:
            future_release = pruned_releases[idx + 1]
        compatible_kube_releases = find_last_n_releases(kube_releases, future_release[1], n=3)
        chart_version = chart_versions.get(release_vsn)
        if not chart_version:
            continue

        vsn = {
            "version": release_vsn,
            "kube": sorted(
                [clean_kube_version(kube_release[0]) for kube_release in compatible_kube_releases],
                reverse=True
            ),
            "requirements": [],
            "chart_version": chart_version,
            "images": get_gpu_images(chart_version, helm_values),
            "incompatibilities": [],
        }

        versions.append(vsn)

    data = read_yaml(filepath)
    if data:
        data["versions"] = sort_versions(versions)
    else:
        data = {"versions": sort_versions(versions)}

    if write_yaml(filepath, data):
        print_success(
            f"Updated compatibility info table: {Fore.CYAN}{filepath}"
        )
    else:
        print_error(f"Failed to update compatibility info for {filepath}")
