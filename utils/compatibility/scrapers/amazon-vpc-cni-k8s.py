# scrapers/new-scraper.py

from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    update_compatibility_info,
    update_chart_versions,
    get_github_releases,
    expand_kube_versions,
)

app_name = "amazon-vpc-cni-k8s"
compatibility_url = (
    "https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html"
)


def scrape():

    # Amazon VPC CNI plugin for Kubernetes versions v1.16.0 to v1.16.1
    #   removed compatibility with Kubernetes versions 1.23 and earlier.
    # VPC CNI version v1.16.2 restores compatibility with Kubernetes versions 1.23 and earlier

    versions = []
    releases = get_github_releases("aws", "amazon-vpc-cni-k8s")
    base_kube_versions = expand_kube_versions("1.23", "1.30")

    for release in releases:
        ver = release.lstrip("v")

        # Set default kube_versions to base_kube_versions
        kube_versions = base_kube_versions

        # Apply specific conditions
        if "v1.16.0" <= release <= "v1.16.1":
            kube_versions = expand_kube_versions("1.24", "1.30")
        elif ver == "v1.16.2":
            kube_versions = base_kube_versions

        version_info = OrderedDict(
            [
                ("version", ver),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )

    update_chart_versions(app_name, "aws-vpc-cni")
