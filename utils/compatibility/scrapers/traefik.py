# scrapers/new-scraper.py

from collections import OrderedDict
from utils import (
    update_compatibility_info,
    update_chart_versions,
    get_github_releases,
    latest_kube_version,
    expand_kube_versions,
)

app_name = "traefik"
compatibility_url = (
    "https://doc.traefik.io/traefik/providers/kubernetes-ingress/"
)


def scrape():

    # https://doc.traefik.io/traefik/providers/kubernetes-ingress/#requirements
    # Traefik follows the Kubernetes support policy,
    # and supports at least the latest three minor versions of Kubernetes.
    # General functionality cannot be guaranteed for older versions.
    versions = []
    kube_end = latest_kube_version()
    kube_start = f"1.{int(kube_end.split('.')[1]) - 2}"
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
