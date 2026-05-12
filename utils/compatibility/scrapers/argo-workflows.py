import re
import requests
from collections import OrderedDict

from utils import (
    expand_kube_versions,
    get_chart_versions,
    get_kube_release_info,
    get_github_releases_timestamps,
    find_last_n_releases,
    clean_kube_version,
    print_error,
    print_success,
    print_warning,
    update_compatibility_info,
)

app_name = "argo-workflows"
github_repo_owner = "argoproj"
github_repo_name = "argo-workflows"


def fetch_k8s_versions_from_tag(tag):
    """
    Fetch the hack/k8s-versions.sh file for a given tag and parse the min/max K8s versions.
    Returns a tuple (min_version, max_version) or None if not found/parseable.
    """
    url = f"https://raw.githubusercontent.com/{github_repo_owner}/{github_repo_name}/{tag}/hack/k8s-versions.sh"
    response = requests.get(url)
    if response.status_code != 200:
        return None

    content = response.text
    min_match = re.search(r'\[min\]=v?(\d+\.\d+)', content)
    max_match = re.search(r'\[max\]=v?(\d+\.\d+)', content)

    if min_match and max_match:
        return (min_match.group(1), max_match.group(1))
    return None


def fetch_github_tags():
    """Fetch release tags from GitHub API."""
    tags = []
    for page in range(1, 5):
        url = f"https://api.github.com/repos/{github_repo_owner}/{github_repo_name}/tags"
        response = requests.get(url, params={"page": page, "per_page": 100})
        if response.status_code != 200:
            print_error(f"Failed to fetch GitHub tags. Status code: {response.status_code}")
            break
        page_tags = [tag["name"] for tag in response.json()]
        if not page_tags:
            break
        tags.extend(page_tags)
    return tags


def scrape():
    release_tags = fetch_github_tags()
    if not release_tags:
        print_error("No release tags found.")
        return

    chart_versions = get_chart_versions(app_name)
    kube_releases = get_kube_release_info()
    argo_releases = list(reversed(list(get_github_releases_timestamps(github_repo_owner, github_repo_name))))
    pruned_argo_releases = {r.lstrip("v"): ts for r, ts in argo_releases if "-" not in r}

    rows = []
    for tag in release_tags:
        if "-" in tag:
            continue

        tag_version = tag.lstrip("v")
        chart_version = chart_versions.get(tag_version)
        if not chart_version:
            continue

        k8s_versions_from_file = fetch_k8s_versions_from_tag(tag)

        if k8s_versions_from_file:
            min_k8s, max_k8s = k8s_versions_from_file
            kube_versions = expand_kube_versions(min_k8s, max_k8s)
        else:
            release_ts = pruned_argo_releases.get(tag_version)
            if release_ts:
                compatible_kube_releases = find_last_n_releases(kube_releases, release_ts, n=3)
                kube_versions = [clean_kube_version(kr[0]) for kr in compatible_kube_releases]
            else:
                print_warning(f"No K8s version info found for {tag}, skipping.")
                continue

        if not kube_versions:
            print_warning(f"Could not determine K8s versions for {tag}, skipping.")
            continue

        rows.append(OrderedDict([
            ("version", tag_version),
            ("kube", kube_versions),
            ("chart_version", chart_version),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
        print_success(f"Fetched compatibility info for tag: {tag}")

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
