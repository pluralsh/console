# scrapers/new-scraper.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    update_compatibility_info,
    get_chart_versions,
    expand_kube_versions,
    get_github_releases,
)

app_name = "calico"
compatibility_url = "https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements#kubernetes-requirements"


def scrape():

    # https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements#supported-versions
    # We test Calico v3.28 against the following Kubernetes versions. Other versions may work,
    # but we are not actively testing them.
    # v1.27, v1.28, v1.29, v1.30
    # Due to changes in the Kubernetes API, Calico v3.28 will not work on Kubernetes v1.20 or below. v1.21 may work,
    # but is no longer tested. Newer versions may also work, but we recommend upgrading to
    # a version of Calico that is tested against the newer Kubernetes version.
    versions = []
    kube_versions = expand_kube_versions("1.27", "1.30")
    releases = get_github_releases("projectcalico", "calico")
    chart_versions = get_chart_versions(app_name, "tigera-operator")
    for release in releases:
        ver = release.lstrip("v")
        chart_version = chart_versions.get(ver)
        if not chart_version:
            continue
        version_info = OrderedDict(
            [
                ("version", ver),
                ("kube", kube_versions),
                ("chart_version", chart_version),
            ]
        )
        versions.append(version_info)

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )

