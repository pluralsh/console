import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import printError, update_compatibility_info

GITHUB_REPO_URL = "https://github.com/kubernetes-sigs/external-dns"
GITHUB_API_TAGS_URL = (
    "https://api.github.com/repos/kubernetes-sigs/external-dns/tags"
)

# Read the current kube version from ../../KUBE_VERSION file
with open("../../KUBE_VERSION", "r") as file:
    current_kube_version = file.read().strip()


def get_github_tags():
    response = requests.get(GITHUB_API_TAGS_URL)
    if response.status_code == 200:
        return [tag["name"] for tag in response.json()]
    else:
        printError(
            f"Failed to fetch GitHub tags. Status code: {response.status_code}"
        )
        return []


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


def scrape():
    response = requests.get(GITHUB_REPO_URL)
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, "html.parser")
        heading = soup.find("h2", string="Kubernetes version compatibility")

        if heading:
            table = heading.find_next("table")
            if table:
                compat_map = {}
                headers = table.find("thead").find_all("th")
                external_dns_versions = [
                    header.get_text(strip=True) for header in headers
                ][1:]
                print(external_dns_versions)
                tbody = table.find("tbody")
                for tr in tbody.find_all("tr"):
                    k8s_version_range = tr.find("td").get_text(strip=True)
                    compatibility = tr.find_all("td")  # Skip the first column
                    print(k8s_version_range, compatibility)

                    # if compat_cell.get_text(strip=True) == "✅":

                # Get release tags from GitHub API and apply compatibility ranges
                release_tags = get_github_tags()
                rows = []
                for tag in release_tags:
                    tag_version = tag.lstrip("v")
                    kube_versions = []
                    print(tag_version)

                    version_info = OrderedDict(
                        [
                            ("version", tag_version),
                            ("kube", kube_versions),
                            ("requirements", []),
                            ("incompatibilities", []),
                        ]
                    )
                    rows.append(version_info)

                update_compatibility_info(
                    "../../static/compatibilities/external-dns.yaml", rows
                )
            else:
                printError("No table found after the specified heading.")
        else:
            printError("Specified heading not found on the page.")
    else:
        printError(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
