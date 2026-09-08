import re
import subprocess

import requests
import yaml

from utils import reduce_versions, update_compatibility_info


APP_NAME = "capsule"
RELEASES_URL = "https://api.github.com/repos/projectcapsule/capsule/releases"
CHART_URL = "oci://ghcr.io/projectcapsule/charts/capsule"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def parse_compatibility(body):
    """Read the explicit release table, not the moving 'latest Kubernetes' policy."""
    marker = re.search(r"Kubernetes compatibility", body, re.IGNORECASE)
    if marker is None:
        # Older releases do not publish this table. Do not infer their support.
        return []

    lines = [line.lstrip("> ").strip() for line in body[marker.end():].splitlines()]
    header = "| Kubernetes version | Minimum required |"
    for index, line in enumerate(lines):
        if re.sub(r"\s+", " ", line) == header:
            break
    else:
        raise ValueError("Capsule compatibility section has no recognized table")

    if index + 1 >= len(lines) or not re.fullmatch(r"\|[\s:|-]+\|", lines[index + 1]):
        raise ValueError("Malformed Capsule compatibility table header")

    kube_versions = []
    for line in lines[index + 2:]:
        if not line.startswith("|"):
            break
        cells = [cell.strip().strip("`").strip() for cell in line.strip("|").split("|")]
        if len(cells) != 2:
            raise ValueError(f"Malformed Capsule compatibility row: {line}")
        kube = re.fullmatch(r"v?(\d+\.\d+)", cells[0])
        minimum = re.fullmatch(r">=\s*v?(\d+\.\d+)\.0", cells[1])
        if not kube or not minimum or kube[1] != minimum[1]:
            # The catalog records minors, so a nonzero minimum patch cannot be
            # represented accurately. Fail rather than advertise the whole minor.
            raise ValueError(f"Unsupported Capsule compatibility row: {line}")
        if kube[1] in kube_versions:
            raise ValueError(f"Duplicate Kubernetes version: {kube[1]}")
        kube_versions.append(kube[1])

    if not kube_versions:
        raise ValueError("Empty Capsule compatibility table")
    return kube_versions


def fetch_releases():
    releases = []
    page = 1
    while True:
        response = requests.get(RELEASES_URL, params={"per_page": 100, "page": page}, timeout=30)
        response.raise_for_status()
        batch = response.json()
        if not isinstance(batch, list):
            raise ValueError("Expected a list of Capsule releases")
        releases.extend(batch)
        if len(batch) < 100:
            return releases
        page += 1


def extract_versions(releases):
    versions = []
    seen = set()
    for release in releases:
        if release.get("draft") or release.get("prerelease"):
            continue
        tag = release["tag_name"]
        if not re.fullmatch(r"v\d+\.\d+\.\d+", tag):
            continue
        version = tag[1:]
        if version in seen:
            raise ValueError(f"Duplicate Capsule release: {tag}")
        seen.add(version)
        kube = parse_compatibility(release.get("body") or "")
        if kube:
            versions.append({"version": version, "kube": kube})

    if not versions:
        raise ValueError("No explicit Capsule compatibility information found")
    # Keep every minor/compatibility boundary and the newest patch, following
    # the shared catalog convention, before resolving their published charts.
    return reduce_versions(versions)


def chart_version_for(version):
    # Source Chart.yaml contains 0.0.0 placeholders. Verify the published OCI
    # package instead; the release workflow stamps its version and appVersion.
    result = subprocess.run(
        ["helm", "show", "chart", CHART_URL, "--version", version],
        capture_output=True, text=True, check=True, timeout=120,
    )
    chart = yaml.safe_load(result.stdout)
    if (
        not isinstance(chart, dict)
        or chart.get("name") != APP_NAME
        or str(chart.get("appVersion", "")).lstrip("v") != version
        or str(chart.get("version", "")) != version
    ):
        raise ValueError(f"Published Capsule chart does not match release {version}")
    return version


def scrape():
    versions = extract_versions(fetch_releases())
    for version in versions:
        version["chart_version"] = chart_version_for(version["version"])
    # Resolve every chart before updating the table. A failed request or a
    # changed upstream format must not result in a partial compatibility write.
    update_compatibility_info(TARGET_FILE, versions)
