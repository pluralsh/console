import re
import requests
from collections import OrderedDict
from utils import (
    update_compatibility_info,
    validate_semver,
    print_error,
)

APP_NAME = "bigbang"
OUTPUT_PATH = "../../static/compatibilities/bigbang.yaml"
GITLAB_PROJECT_ID = "2872"
GITLAB_API_URL = "https://repo1.dso.mil/api/v4"



def _fetch_release_page(page):
    """Fetch a paginated release page from GitLab API."""
    url = f"{GITLAB_API_URL}/projects/{GITLAB_PROJECT_ID}/releases"
    params = {"page": page, "per_page": 100, "order_by": "released_at", "sort": "desc"}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print_error(f"Failed to fetch Big Bang releases page {page}: {e}")
        return []


def _release_version(tag):
    """Validate and normalize a release tag to semantic version."""
    tag_clean = tag.lstrip("v")
    validated = validate_semver(tag_clean)
    if not validated:
        return None
    return f"{validated.major}.{validated.minor}.{validated.patch}"


def _extract_kube_versions(description):
    """Extract Kubernetes versions from release description using priority fallbacks."""
    if not description:
        return []

    # Pattern 1: "primarily tested on Kubernetes X.Y" (most common in recent releases)
    tested_match = re.search(
        r"primarily tested on Kubernetes\s+v?(\d+)\.(\d+)",
        description,
        re.IGNORECASE,
    )
    if tested_match:
        return [f"{tested_match.group(1)}.{tested_match.group(2)}"]

    # Pattern 2: "Kubernetes X.Y - X.Y" range format
    range_match = re.search(
        r"Kubernetes\s+v?(\d+)\.(\d+)\s*-\s*v?(\d+)\.(\d+)",
        description,
        re.IGNORECASE,
    )
    if range_match:
        start_major, start_minor = int(range_match.group(1)), int(range_match.group(2))
        end_major, end_minor = int(range_match.group(3)), int(range_match.group(4))
        if (start_major, start_minor) <= (end_major, end_minor):
            versions = []
            major, minor = start_major, start_minor
            while (major, minor) <= (end_major, end_minor):
                versions.append(f"{major}.{minor}")
                minor += 1
            return list(reversed(versions))

    # Pattern 3: "Kubernetes X.Y is the oldest" hint
    oldest_match = re.search(
        r"Kubernetes\s+v?(\d+)\.(\d+)\s+is the oldest",
        description,
        re.IGNORECASE,
    )
    if oldest_match:
        return [f"{oldest_match.group(1)}.{oldest_match.group(2)}"]

    return []


def _collect_releases():
    """Collect all Big Bang releases with validated semantic versions."""
    releases = []
    page = 1
    while True:
        page_releases = _fetch_release_page(page)
        if not page_releases:
            break
        for release in page_releases:
            tag = release.get("tag_name", "")
            version = _release_version(tag)
            if version:
                kube_versions = _extract_kube_versions(release.get("description", ""))
                if kube_versions:
                    releases.append(
                        {
                            "version": version,
                            "kube": kube_versions,
                            "tag": tag,
                        }
                    )
        page += 1

    return releases


def scrape():
    """Main scraper entry point."""
    releases = _collect_releases()

    versions = []
    for release in releases:
        version_info = OrderedDict(
            [
                ("version", release["version"]),
                ("kube", release["kube"]),
                ("chart_version", release["version"]),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    update_compatibility_info(OUTPUT_PATH, versions)

