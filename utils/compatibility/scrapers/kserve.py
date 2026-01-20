import json
import re
import subprocess
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import (
    current_kube_version,
    expand_kube_versions,
    fetch_page,
    print_error,
    print_warning,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "kserve"
KSRV_WEBSITE_VERSIONS_URL = (
    "https://raw.githubusercontent.com/kserve/website/main/versions.json"
)
KSRV_ARCHIVE_VERSIONS_URL = "https://kserve.github.io/archive/versions.json"
KSRV_RELEASES_URL = "https://api.github.com/repos/kserve/kserve/releases"
KSRV_GIT_URL = "https://github.com/kserve/kserve.git"
KSRV_VERSIONED_DOC_URL = (
    "https://raw.githubusercontent.com/kserve/website/main/"
    "versioned_docs/version-{doc_version}/admin-guide/kubernetes-deployment.md"
)
KSRV_ARCHIVE_DEPLOYMENT_URL = (
    "https://kserve.github.io/archive/{doc_version}/admin/kubernetes_deployment/"
)


def fetch_current_doc_versions() -> list[str]:
    content = fetch_page(KSRV_WEBSITE_VERSIONS_URL)
    if not content:
        return []

    try:
        versions = json.loads(content)
    except Exception as e:
        print_error(f"Failed to parse KServe website versions.json: {e}")
        return []

    return [str(v).strip() for v in versions if str(v).strip()]


def fetch_archive_doc_versions() -> list[str]:
    content = fetch_page(KSRV_ARCHIVE_VERSIONS_URL)
    if not content:
        return []

    try:
        versions = json.loads(content)
    except Exception as e:
        print_error(f"Failed to parse KServe archive versions.json: {e}")
        return []

    result: list[str] = []
    for item in versions:
        if isinstance(item, dict):
            value = item.get("version", "")
        else:
            value = item
        value = str(value).strip()
        if value:
            result.append(value)
    return result


def fetch_doc_versions() -> tuple[list[str], set[str]]:
    current = fetch_current_doc_versions()
    archive = fetch_archive_doc_versions()

    archive_set = set(archive)
    combined = sorted(
        set(current + archive),
        key=lambda v: validate_semver(v) or validate_semver(v + ".0"),
        reverse=True,
    )
    return combined, archive_set


def parse_min_kube_version(markdown: str) -> str | None:
    patterns = [
        r"\*\*Kubernetes\*\*:\s*Version\s*v?(\d+\.\d+)\+",
        r"Kubernetes\s+cluster\s*\(v?(\d+\.\d+)\+\)",
        r"Kubernetes\s*:\s*v?(\d+\.\d+)\+",
    ]
    for pattern in patterns:
        match = re.search(pattern, markdown, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def fetch_min_kube_for_doc_version(doc_version: str) -> str | None:
    content = fetch_page(KSRV_VERSIONED_DOC_URL.format(doc_version=doc_version))
    if not content:
        return None

    markdown = content.decode("utf-8", errors="replace")
    return parse_min_kube_version(markdown)


def normalize_kube_minor(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None

    match = re.search(r"v?(\d+)\.(\d+)", value)
    if not match:
        return None

    return f"{int(match.group(1))}.{int(match.group(2))}"


def fetch_archive_kube_versions(doc_version: str) -> list[str] | None:
    content = fetch_page(KSRV_ARCHIVE_DEPLOYMENT_URL.format(doc_version=doc_version))
    if not content:
        return None

    soup = BeautifulSoup(content, "html.parser")
    heading = soup.find(id="recommended-version-matrix")
    if not heading:
        for candidate in soup.find_all(["h1", "h2", "h3", "h4"]):
            if candidate.get_text(strip=True).lower() == "recommended version matrix":
                heading = candidate
                break

    if not heading:
        print_error(
            f"Could not find 'Recommended Version Matrix' heading for KServe archive {doc_version}."
        )
        return None

    table = heading.find_next("table")
    if not table:
        print_error(
            f"Could not find recommended matrix table for KServe archive {doc_version}."
        )
        return None

    kube_versions: list[str] = []
    for row in table.find_all("tr"):
        columns = row.find_all("td")
        if not columns:
            continue
        kube_value = columns[0].get_text(strip=True)
        kube_minor = normalize_kube_minor(kube_value)
        if kube_minor and kube_minor not in kube_versions:
            kube_versions.append(kube_minor)

    return kube_versions or None


def fetch_kserve_releases(max_pages: int = 2) -> list[str]:
    tags: list[str] = []
    for page in range(1, max_pages + 1):
        content = fetch_page(f"{KSRV_RELEASES_URL}?page={page}&per_page=100")
        if not content:
            break

        try:
            releases = json.loads(content)
        except Exception as e:
            print_error(f"Failed to parse KServe releases JSON: {e}")
            break

        if not releases:
            break

        for release in releases:
            tag = str(release.get("tag_name", "")).lstrip("v")
            vsn = validate_semver(tag)
            if not vsn:
                continue
            tags.append(str(vsn))

    return sorted(set(tags), key=lambda v: validate_semver(v), reverse=True)


def fetch_kserve_versions() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--tags", KSRV_GIT_URL],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception as e:
        print_warning(
            f"Failed to fetch KServe tags via git ls-remote ({e}); falling back to GitHub releases API."
        )
        return fetch_kserve_releases()

    versions: list[str] = []
    for line in result.stdout.splitlines():
        parts = line.split("\t", 1)
        if len(parts) != 2:
            continue
        ref = parts[1]
        if not ref.startswith("refs/tags/"):
            continue

        tag = ref[len("refs/tags/") :]
        if tag.endswith("^{}"):
            tag = tag[: -len("^{}")]
        tag = tag.lstrip("v")

        vsn = validate_semver(tag)
        if vsn:
            versions.append(str(vsn))

    if versions:
        return sorted(set(versions), key=lambda v: validate_semver(v), reverse=True)

    print_warning(
        "No valid KServe tags found via git ls-remote; falling back to GitHub releases API."
    )
    return fetch_kserve_releases()


def latest_patch_for_minor(releases: list[str], minor: str) -> str:
    wanted = []
    for release in releases:
        vsn = validate_semver(release)
        if not vsn:
            continue
        if f"{vsn.major}.{vsn.minor}" == minor:
            wanted.append(vsn)

    if wanted:
        return str(sorted(wanted, reverse=True)[0])

    # Fall back to a .0 patch if we can't resolve it
    if minor.count(".") == 1:
        return minor + ".0"
    return minor


def scrape():
    latest_kube_minor = current_kube_version()
    if not latest_kube_minor:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    doc_versions, archive_versions = fetch_doc_versions()
    if not doc_versions:
        print_error("Failed to determine KServe documentation versions.")
        return

    releases = fetch_kserve_versions()

    rows = []
    for doc_version in doc_versions:
        kube_versions: list[str] | None = None
        if doc_version in archive_versions:
            kube_versions = fetch_archive_kube_versions(doc_version)
        else:
            min_kube = fetch_min_kube_for_doc_version(doc_version)
            if min_kube:
                kube_versions = expand_kube_versions(min_kube, latest_kube_minor)

        if not kube_versions:
            print_error(
                f"Could not determine Kubernetes compatibility for KServe docs {doc_version}."
            )
            continue

        release_version = latest_patch_for_minor(releases, doc_version)
        chart_version = f"v{release_version}"

        rows.append(
            OrderedDict(
                [
                    ("version", release_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_version),
                ]
            )
        )

    if not rows:
        print_error("No KServe compatibility rows were generated.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
