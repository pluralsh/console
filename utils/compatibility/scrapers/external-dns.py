# scrapers/external_dns.py

import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import printError, update_compatibility_info


GITHUB_REPO_URL = "https://github.com/kubernetes-sigs/external-dns"
GITHUB_API_TAGS_URL = (
    "https://api.github.com/repos/kubernetes-sigs/external-dns/tags"
)


def get_github_tags():
    response = requests.get(GITHUB_API_TAGS_URL)
    if response.status_code == 200:
        return [tag["name"] for tag in response.json()]
    else:
        printError(
            f"Failed to fetch GitHub tags. Status code: {response.status_code}"
        )
        return []


def expand_kube_versions(version_range):
    if "<=" in version_range:
        start_version, end_version = "1.9", version_range.split("<= ")[1]
    elif ">=" in version_range:
        start_version = version_range.split(">= ")[1]
        end_version = (
            "1.28"  # assuming the latest version is 1.28 for example purposes
        )
    elif ">=" in version_range and "<=" in version_range:
        start_version = version_range.split(">= ")[1].split(" ")[0]
        end_version = version_range.split("<= ")[1]

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
        readme_section = soup.find(
            "article", class_="markdown-body entry-content container-lg"
        )

        if readme_section:
            table = readme_section.find("table")
            if table:
                rows = []
                headers = table.find("thead").find_all("th")[
                    1:
                ]  # Skip the first header
                external_dns_versions = [
                    header.get_text(strip=True) for header in headers
                ]

                tbody = table.find("tbody")
                for tr in tbody.find_all("tr"):
                    k8s_version_range = tr.find("td").get_text(strip=True)
                    compatibility = tr.find_all("td")[
                        1:
                    ]  # Skip the first column

                    for version_header, compat_cell in zip(
                        external_dns_versions, compatibility
                    ):
                        if compat_cell.get_text(strip=True) == "✅":
                            version_info = OrderedDict(
                                [
                                    ("version", version_header.lstrip("v")),
                                    (
                                        "kube",
                                        expand_kube_versions(k8s_version_range),
                                    ),
                                    ("requirements", []),
                                    ("incompatibilities", []),
                                ]
                            )
                            rows.append(version_info)

                # Get release tags from GitHub API
                release_tags = get_github_tags()
                for tag in release_tags:
                    version_info = OrderedDict(
                        [
                            ("version", tag.lstrip("v")),
                            ("kube", []),
                            ("requirements", []),
                            ("incompatibilities", []),
                        ]
                    )
                    rows.append(version_info)

                update_compatibility_info(
                    "../../static/compatibilities/external-dns.yaml", rows
                )
            else:
                printError("No table found in the README section.")
        else:
            printError("Could not find the README section on the page.")
    else:
        printError(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
