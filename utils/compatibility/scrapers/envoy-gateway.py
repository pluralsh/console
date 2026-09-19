import json
import re
from collections import OrderedDict
from datetime import datetime

from packaging.version import Version, InvalidVersion

from utils import fetch_page, update_compatibility_info

APP_NAME = "envoy-gateway"
MATRIX_URL = (
    "https://raw.githubusercontent.com/envoyproxy/gateway/main/"
    "site/content/en/news/releases/matrix.md"
)
RELEASES_URL = "https://api.github.com/repos/envoyproxy/gateway/releases"

_VERSION_FAMILY_RE = re.compile(r"^v(?P<major>\d+)\.(?P<minor>\d+)$")
_KUBE_MINOR_RE = re.compile(r"^v(?P<major>\d+)\.(?P<minor>\d+)$")
_STABLE_RELEASE_RE = re.compile(
    r"^v(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)$"
)


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else str(content)


def _clean_cell(value):
    return value.strip().replace("**", "")


def _parse_eol(value):
    value = _clean_cell(value)
    if not value or value.lower() == "n/a":
        return None
    try:
        return datetime.strptime(value, "%Y/%m/%d").date().isoformat()
    except ValueError as exc:
        raise ValueError(f"Invalid Envoy Gateway EOL date: {value}") from exc


def _parse_kube_versions(value):
    versions = []
    for raw in _clean_cell(value).split(","):
        token = raw.strip()
        match = _KUBE_MINOR_RE.fullmatch(token)
        if not match:
            raise ValueError(f"Invalid Kubernetes version in Envoy Gateway matrix: {token}")
        version = f"{int(match.group('major'))}.{int(match.group('minor'))}"
        if version not in versions:
            versions.append(version)
    if not versions:
        raise ValueError("Envoy Gateway matrix row has no Kubernetes versions")
    return versions


def parse_compatibility_matrix(content):
    """Return tested Kubernetes minors and EOL per Envoy Gateway release family.

    The upstream matrix explicitly describes the Kubernetes column as a range of
    tested versions, so this parser does not infer or expand beyond those cells.
    """
    lines = _decode(content).splitlines()
    header_index = None
    for idx, line in enumerate(lines):
        if line.strip().startswith("| Envoy Gateway version |") and "Kubernetes version" in line:
            header_index = idx
            break
    if header_index is None:
        raise ValueError("Envoy Gateway compatibility matrix table not found")

    result = OrderedDict()
    for line in lines[header_index + 2 :]:
        stripped = line.strip()
        if not stripped.startswith("|"):
            break
        cells = [_clean_cell(cell) for cell in stripped.strip("|").split("|")]
        if len(cells) != 6:
            raise ValueError(f"Unexpected Envoy Gateway matrix column count: {len(cells)}")

        family = cells[0]
        if family == "latest":
            continue
        match = _VERSION_FAMILY_RE.fullmatch(family)
        if not match:
            raise ValueError(f"Invalid Envoy Gateway release family: {family}")
        minor = f"{int(match.group('major'))}.{int(match.group('minor'))}"
        if minor in result:
            raise ValueError(f"Duplicate Envoy Gateway matrix family: {minor}")

        result[minor] = {
            "kube": _parse_kube_versions(cells[4]),
            "eolAt": _parse_eol(cells[5]),
        }

    if not result:
        raise ValueError("No stable Envoy Gateway compatibility rows found")
    return result


def parse_releases(content):
    try:
        releases = json.loads(_decode(content))
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid Envoy Gateway releases JSON") from exc
    if not isinstance(releases, list):
        raise ValueError("Envoy Gateway releases response is not a list")

    versions = []
    for release in releases:
        if not isinstance(release, dict):
            raise ValueError("Invalid Envoy Gateway release entry")
        if release.get("draft") or release.get("prerelease"):
            continue
        tag = str(release.get("tag_name", ""))
        match = _STABLE_RELEASE_RE.fullmatch(tag)
        if not match:
            continue
        version = tag.lstrip("v")
        try:
            Version(version)
        except InvalidVersion as exc:
            raise ValueError(f"Invalid Envoy Gateway stable release: {tag}") from exc
        versions.append(version)
    return versions


def fetch_stable_releases(max_pages=3):
    versions = []
    for page in range(1, max_pages + 1):
        content = fetch_page(f"{RELEASES_URL}?per_page=100&page={page}")
        if not content:
            raise ValueError(f"Failed to fetch Envoy Gateway releases page {page}")
        page_versions = parse_releases(content)
        raw = json.loads(_decode(content))
        versions.extend(page_versions)
        if len(raw) < 100:
            break
    unique = sorted(set(versions), key=Version, reverse=True)
    if not unique:
        raise ValueError("No stable Envoy Gateway releases found")
    return unique


def latest_patch_by_minor(releases):
    latest = {}
    for release in releases:
        parsed = Version(release)
        minor = f"{parsed.major}.{parsed.minor}"
        current = latest.get(minor)
        if current is None or parsed > Version(current):
            latest[minor] = str(parsed)
    return latest


def build_rows(matrix, releases):
    latest = latest_patch_by_minor(releases)
    rows = []
    missing = []

    for minor, support in matrix.items():
        release = latest.get(minor)
        if not release:
            missing.append(minor)
            continue

        row = OrderedDict(
            [
                ("version", release),
                ("kube", support["kube"]),
                ("requirements", []),
                ("incompatibilities", []),
                ("chart_version", f"v{release}"),
            ]
        )
        if support.get("eolAt"):
            row["eolAt"] = support["eolAt"]
        rows.append(row)

    if missing:
        raise ValueError(
            "No stable Envoy Gateway release found for matrix families: "
            + ", ".join(missing)
        )
    if not rows:
        raise ValueError("No Envoy Gateway compatibility rows generated")
    return rows


def scrape():
    matrix_content = fetch_page(MATRIX_URL)
    if not matrix_content:
        raise ValueError("Failed to fetch Envoy Gateway compatibility matrix")

    matrix = parse_compatibility_matrix(matrix_content)
    releases = fetch_stable_releases()
    rows = build_rows(matrix, releases)
    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
