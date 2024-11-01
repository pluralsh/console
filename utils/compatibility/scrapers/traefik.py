# scrapers/new-scraper.py

from collections import OrderedDict
from utils import (
    update_compatibility_info,
    update_chart_versions,
    get_github_releases,
    current_kube_version,
    expand_kube_versions,
)

app_name = "traefik"


def scrape():
    # https://doc.traefik.io/traefik/providers/kubernetes-ingress/#requirements
    # Traefik follows the Kubernetes support policy,
    # and supports at least the latest three minor versions of Kubernetes.
    versions = []
    kube_end = current_kube_version()
    kube_start = f"1.{int(kube_end.split('.')[1]) - 3}"
    kube_versions = expand_kube_versions(kube_start, kube_end)

    releases = get_github_releases("traefik", "traefik")
    for release in releases:
        if "-" not in release:
            ver = release.lstrip("v")
            version_info = OrderedDict(
                [
                    ("version", ver),
                    ("kube", kube_versions),
                ]
            )
            versions.append(version_info)

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )

    update_chart_versions(app_name)
