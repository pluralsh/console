# scrapers/cert_manager.py

import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    expand_kube_versions,
    get_github_releases,
    current_kube_version,
)

app_name = "aws-ebs-csi-driver"
compatibility_url = "https://aws-quickstart.github.io/cdk-eks-blueprints/addons/ebs-csi-driver/"


def extract_table_data(target_tables):
    rows = []
    return rows


def scrape():

    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    k8s_versions = expand_kube_versions("1.20", current_kube_version())
    releases = get_github_releases("kubernetes-sigs", "aws-ebs-csi-driver")
    chart_versions = get_chart_versions(app_name)
    versions = []
    for release in releases:
        if release.startswith("v"):
            ver = release.lstrip("v")
            chart_version = chart_versions.get(ver)
            if not chart_version:
                continue

            version_info = OrderedDict(
                [
                    ("version", ver),
                    ("kube", k8s_versions),
                    ("chart_version", chart_version),
                ]
            )
            versions.append(version_info)
            # print(version_info)

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )

