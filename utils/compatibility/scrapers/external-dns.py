# scrapers/external_dns.py

import requests
from collections import OrderedDict
from packaging.version import Version
from utils import printError, update_compatibility_info

GITHUB_REPO_URL = "https://github.com/kubernetes-sigs/external-dns"
GITHUB_API_TAGS_URL = (
    "https://api.github.com/repos/kubernetes-sigs/external-dns/tags"
)

# Read the current kube version from ../../KUBE_VERSION file
with open("../../KUBE_VERSION", "r") as file:
    current_kube_version = file.read().strip()


def fetch_github_tags():
    response = requests.get(GITHUB_API_TAGS_URL)
    if response.status_code != 200:
        printError(
            f"Failed to fetch GitHub tags. Status code: {response.status_code}"
        )
        return []
    return [tag["name"] for tag in response.json()]


def expand_kube_versions(start_version, end_version):
    start_major, start_minor = map(int, start_version.split("."))
    end_major, end_minor = map(int, end_version.split("."))
    expanded_versions = []

    major, minor = start_major, start_minor
    while (major < end_major) or (major == end_major and minor <= end_minor):
        expanded_versions.append(f"{major}.{minor}")
        if minor == 9:
            major += 1
            minor = 0
        else:
            minor += 1

    return expanded_versions


compat_map = {
    "0.9.0": expand_kube_versions("1.10", "1.21"),
    "0.10.0": expand_kube_versions("1.19", current_kube_version),
}


def extract_version_info(release_tags):
    rows = []
    for tag in release_tags:
        tag_version = tag.lstrip("v")
        parsed_tag_version = Version(tag_version)

        if parsed_tag_version <= Version("0.9.0"):
            kube_versions = compat_map["0.9.0"]
        else:
            kube_versions = compat_map["0.10.0"]

        version_info = OrderedDict(
            [
                ("version", tag_version),
                ("kube", kube_versions.copy()),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        rows.append(version_info)
    return rows


def scrape():
    release_tags = fetch_github_tags()
    if not release_tags:
        printError("No release tags found.")
        return

    rows = extract_version_info(release_tags)
    update_compatibility_info(
        "../../static/compatibilities/external-dns.yaml", rows
    )
