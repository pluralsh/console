"""Read the installation constraints of published Kube-OVN v2 Helm charts.

These are Helm-declared Kubernetes requirements, not a matrix of tested
Kubernetes releases. The legacy kube-ovn chart is a separate chart family.
"""

import re
import subprocess
from urllib.parse import urljoin, urlsplit

import requests
import yaml
from semantic_version import Version

APP_NAME = "kube-ovn"
CHART_NAME = "kube-ovn-v2"
REGISTRY_PATH = f"kubeovn/charts/{CHART_NAME}"
CHART_URL = f"oci://ghcr.io/{REGISTRY_PATH}"
TAGS_URL = f"https://ghcr.io/v2/{REGISTRY_PATH}/tags/list"
TOKEN_URL = "https://ghcr.io/token"
TIMEOUT = 30


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        return None
    try:
        return Version(value.removeprefix("v"))
    except ValueError:
        return None


def fetch_tags():
    """List this public GHCR chart without requiring a GitHub account/token."""
    response = requests.get(
        TOKEN_URL,
        params={"service": "ghcr.io", "scope": f"repository:{REGISTRY_PATH}:pull"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    token = response.json().get("token")
    if not isinstance(token, str) or not token:
        raise ValueError("GHCR did not return an anonymous pull token")

    tags = set()
    url = TAGS_URL + "?n=1000"
    visited = set()
    while url:
        parsed = urlsplit(url)
        # Only the known tags endpoint may receive the anonymous pull token.
        if (parsed.scheme, parsed.netloc, parsed.path) != (
            "https", "ghcr.io", urlsplit(TAGS_URL).path
        ) or url in visited:
            raise ValueError("Invalid GHCR tags pagination link")
        visited.add(url)
        response = requests.get(
            url, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict) or data.get("name") != REGISTRY_PATH:
            raise ValueError("Unexpected GHCR chart repository")
        page_tags = data.get("tags")
        if not isinstance(page_tags, list) or not all(
            isinstance(tag, str) for tag in page_tags
        ):
            raise ValueError("Malformed GHCR chart tags")
        tags.update(page_tags)
        next_url = response.links.get("next", {}).get("url")
        url = urljoin(url, next_url) if next_url else None

    return sorted(
        (tag for tag in tags if stable_version(tag) is not None),
        key=lambda tag: (stable_version(tag), tag),
        reverse=True,
    )


def fetch_chart(tag):
    if stable_version(tag) is None:
        raise ValueError(f"Invalid stable chart tag: {tag!r}")
    result = subprocess.run(
        ["helm", "show", "chart", CHART_URL, "--version", tag],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return yaml.safe_load(result.stdout)


def kubernetes_versions(constraint, current):
    """Expand the explicit minor floor used by these charts, capped by Plural.

    Reject new constraint forms instead of silently ignoring upper bounds,
    patch restrictions or disjunctions that the minor-only catalog cannot store.
    """
    floor = re.fullmatch(r">=\s*v?1\.(\d+)\.0(?:-0)?", str(constraint).strip())
    ceiling = re.fullmatch(r"1\.(\d+)", str(current).strip())
    if floor is None or ceiling is None:
        raise ValueError(f"Unsupported Kubernetes constraint/current: {constraint!r}/{current!r}")
    low, high = int(floor[1]), int(ceiling[1])
    if low > high:
        raise ValueError("Chart requires a newer Kubernetes minor than Plural tracks")
    return [f"1.{minor}" for minor in range(high, low - 1, -1)]


def build_rows(tags, current, chart_fetcher=None):
    if chart_fetcher is None:
        chart_fetcher = fetch_chart
    rows = []
    aliases = {}
    for tag in dict.fromkeys(tags):
        chart_version = stable_version(tag)
        if chart_version is None:
            continue
        metadata = chart_fetcher(tag)
        if not isinstance(metadata, dict) or metadata.get("name") != CHART_NAME:
            raise ValueError(f"Unexpected Kube-OVN chart metadata for {tag}")
        if stable_version(metadata.get("version")) != chart_version:
            raise ValueError(f"Chart version does not match registry tag {tag}")
        app_version = stable_version(metadata.get("appVersion"))
        if app_version is None:
            raise ValueError(f"Missing stable Kube-OVN application version for {tag}")
        row = {
            "version": str(app_version),
            "kube": kubernetes_versions(metadata.get("kubeVersion"), current),
            # Keep the exact registry tag: historical tags have no v prefix.
            "chart_version": tag,
            "requirements": [],
            "incompatibilities": [],
        }
        existing = aliases.get(chart_version)
        if existing and (existing["version"], existing["kube"]) != (row["version"], row["kube"]):
            raise ValueError(f"Conflicting chart aliases for Kube-OVN {chart_version}")
        aliases[chart_version] = row
        # Keep every exact tag until its deployed application image is verified.
        rows.append(row)
    if not rows:
        raise ValueError("No stable Kube-OVN v2 chart versions found")
    return sorted(rows, key=lambda row: (
        stable_version(row["version"]), stable_version(row["chart_version"]), row["chart_version"]
    ), reverse=True)


def chart_images(tag, current):
    from utils import find_nested_images

    result = subprocess.run(
        ["helm", "template", CHART_NAME, CHART_URL, "--version", tag,
         "--kube-version", current],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return find_nested_images(list(yaml.safe_load_all(result.stdout)))


def verify_images(rows, current, image_fetcher=None):
    if image_fetcher is None:
        image_fetcher = chart_images
    verified = {}
    for row in rows:
        images = image_fetcher(row["chart_version"], current)
        versions = set()
        for image in images:
            match = re.search(r"(?:^|/)kube-ovn:([^@]+)$", image)
            if match:
                version = stable_version(match[1])
                if version is None:
                    raise ValueError(f"Unversioned Kube-OVN image: {image}")
                versions.add(str(version))
        if not versions:
            raise ValueError(f"No Kube-OVN image found in chart {row['chart_version']}")
        if versions != {row["version"]}:
            # The published 1.14.2 and 1.15.0 charts deploy kube-ovn:v1.14.0
            # despite their appVersion. Do not create a false application mapping.
            print(f"Skipping chart {row['chart_version']}: appVersion {row['version']} "
                  f"does not match rendered Kube-OVN versions {sorted(versions)}")
            continue
        existing = verified.get(row["version"])
        if existing is None or (stable_version(row["chart_version"]), row["chart_version"]) > (
            stable_version(existing["chart_version"]), existing["chart_version"]
        ):
            verified[row["version"]] = {**row, "images": images}
    if not verified:
        raise ValueError("No Kube-OVN charts match their declared application version")
    return [verified[version] for version in sorted(verified, key=stable_version, reverse=True)]


def scrape():
    from utils import current_kube_version, update_compatibility_info

    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")
    # Finish all downloads and validation before modifying the existing table.
    rows = build_rows(fetch_tags(), current)
    rows = verify_images(rows, current)
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
