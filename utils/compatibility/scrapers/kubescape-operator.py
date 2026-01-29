from __future__ import annotations

from typing import Optional

from utils import (
    clean_kube_version,
    find_last_n_releases,
    get_chart_versions,
    get_github_releases_timestamps,
    get_kube_release_info,
    print_error,
    update_compatibility_info,
    validate_semver,
)


app_name = "kubescape-operator"
TAG_PREFIX = "kubescape-operator-"


def _parse_release_tag(tag: str) -> Optional[str]:
    if not tag.startswith(TAG_PREFIX):
        return None

    version = tag[len(TAG_PREFIX) :]
    if "-" in version:
        return None

    semver = validate_semver(version)
    if not semver:
        return None

    return str(semver)


def _load_chart_releases() -> list[tuple[str, object]]:
    releases = []
    for tag, ts in get_github_releases_timestamps("kubescape", "helm-charts"):
        version = _parse_release_tag(tag)
        if not version:
            continue
        releases.append((version, ts))

    releases.sort(key=lambda item: item[1])
    return releases


def scrape() -> None:
    kube_releases = get_kube_release_info()
    chart_versions = get_chart_versions(app_name)
    if not chart_versions:
        print_error("No chart versions found for kubescape-operator.")
        return

    releases = _load_chart_releases()
    if not releases:
        print_error("No kubescape-operator releases found.")
        return

    versions = []
    for idx, (release_vsn, ts) in enumerate(releases):
        chart_version = chart_versions.get(release_vsn)
        if not chart_version:
            continue

        future_release_ts = ts
        if idx < len(releases) - 1:
            future_release_ts = releases[idx + 1][1]

        compatible_kube_releases = find_last_n_releases(
            kube_releases, future_release_ts, n=3
        )
        kube_versions = [
            clean_kube_version(kube_release[0])
            for kube_release in compatible_kube_releases
        ]

        versions.append(
            {
                "version": release_vsn,
                "kube": kube_versions,
                "requirements": [],
                "chart_version": chart_version,
                "incompatibilities": [],
            }
        )

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", versions
    )
