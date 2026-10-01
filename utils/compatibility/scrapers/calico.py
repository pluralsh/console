# Calico compatibility scraper

import re
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    update_compatibility_info,
    get_chart_versions,
    fetch_page,
    get_github_releases,
    print_error,
)

app_name = "calico"
compatibility_url = (
    "https://docs.tigera.io/calico/{version}/getting-started/kubernetes/requirements"
)


def _release_family(version):
    """Return the major/minor Calico documentation family for a release."""
    match = re.fullmatch(r"v?(\d+\.\d+)(?:\.\d+)", version)
    if not match:
        raise ValueError(f"Invalid Calico release version: {version}")
    return match.group(1)


def parse_kube_versions(content, calico_family):
    """Extract Kubernetes versions explicitly tested by a Calico family."""
    text = BeautifulSoup(content, "html.parser").get_text(" ", strip=True)
    pattern = (
        rf"We test Calico v?{re.escape(calico_family)}\s+against\s+"
        r"the following Kubernetes versions\."
        r"(.*?)\s+Due to changes in the Kubernetes API"
    )
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(
            f"Could not find the supported Kubernetes versions for Calico {calico_family}"
        )

    versions = re.findall(r"\bv?(\d+\.\d+)\b", match.group(1))
    versions = sorted(
        set(versions),
        key=lambda version: tuple(int(part) for part in version.split(".")),
        reverse=True,
    )
    if not versions:
        raise ValueError(
            f"Calico {calico_family} documentation contained no Kubernetes versions"
        )
    return versions


def do_scrape(app_name):
    versions = []
    releases = get_github_releases("projectcalico", "calico")
    chart_versions = get_chart_versions(app_name, "tigera-operator")

    release_versions = []
    for release in releases:
        ver = release.lstrip("v")
        chart_version = chart_versions.get(ver)
        if chart_version:
            release_versions.append((ver, chart_version))

    if not release_versions:
        print_error("No released Calico versions have matching operator charts")
        return

    kube_versions_by_family = {}
    for ver, _ in release_versions:
        family = _release_family(ver)
        if family in kube_versions_by_family:
            continue
        content = fetch_page(compatibility_url.format(version=family))
        if not content:
            print_error(f"Could not fetch Calico {family} requirements")
            return
        try:
            kube_versions_by_family[family] = parse_kube_versions(content, family)
        except ValueError as error:
            print_error(str(error))
            return

    for ver, chart_version in release_versions:
        version_info = OrderedDict(
            [
                ("version", ver),
                ("kube", kube_versions_by_family[_release_family(ver)]),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)


def scrape():
    do_scrape("calico")
