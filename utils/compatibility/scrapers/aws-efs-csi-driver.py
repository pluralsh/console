import re
from collections import OrderedDict
from utils import (
    print_error,
    update_compatibility_info,
    update_chart_versions,
    get_github_releases,
    expand_kube_versions,
    current_kube_version,
)

app_name = "aws-efs-csi-driver"
compatibility_url = "https://github.com/kubernetes-sigs/aws-efs-csi-driver"


def get_kube_versions(version):
    latest_kube_versions = expand_kube_versions("1.17", current_kube_version())
    compatibility = [
        ("2.0.x", latest_kube_versions),
        ("1.7.x", latest_kube_versions),
        ("1.6.x", latest_kube_versions),
        ("1.5.x", latest_kube_versions),
        ("1.4.x", latest_kube_versions),
        ("1.3.x", latest_kube_versions),
        ("1.2.x", latest_kube_versions),
        ("1.1.x", expand_kube_versions("1.14", current_kube_version())),
        ("1.0.x", expand_kube_versions("1.14", current_kube_version())),
        ("0.3.0", expand_kube_versions("1.14", current_kube_version())),
        ("0.2.0", expand_kube_versions("1.14", current_kube_version())),
        ("0.1.0", ["1.11", "1.12", "1.13"]),
    ]

    for pattern, kube_versions in compatibility:
        if re.match(pattern.replace(".", r"\.").replace("x", r".*"), version):
            return kube_versions

    return []


def scrape():
    versions = []
    releases = get_github_releases("kubernetes-sigs", "aws-efs-csi-driver")
    for release in releases:
        if release.startswith("v"):
            ver = release.lstrip("v")
            kube_ver = get_kube_versions(ver)
            version_info = OrderedDict(
                [
                    ("version", ver),
                    ("kube", kube_ver),
                ]
            )
            versions.append(version_info)

    if versions:
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", versions
        )
    else:
        print_error("No compatibility information found.")

    update_chart_versions(app_name)
