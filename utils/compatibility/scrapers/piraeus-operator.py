from __future__ import annotations

import json
import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version


APP_NAME = "piraeus-operator"
RELEASES_URL = (
    "https://api.github.com/repos/piraeusdatastore/piraeus-operator/releases"
)
README_URL = (
    "https://raw.githubusercontent.com/piraeusdatastore/piraeus-operator/"
    "v{version}/README.md"
)
CHART_URL = (
    "https://raw.githubusercontent.com/piraeusdatastore/piraeus-operator/"
    "v{version}/charts/piraeus/Chart.yaml"
)
MIN_VERSION = Version("2.0.0")

_KUBE_BADGE_RE = re.compile(
    r"Kubernetes-v?(\d+\.\d+)(?:%2B|\+)", re.IGNORECASE
)


def _decode_text(payload: bytes | str, source: str) -> str:
    if isinstance(payload, bytes):
        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Could not decode {source}") from exc
    if isinstance(payload, str):
        return payload
    raise ValueError(f"Unexpected {source} payload type")


def stable_versions(payload: bytes | str) -> list[str]:
    """Return the newest stable release for each supported minor."""
    try:
        releases = json.loads(_decode_text(payload, "Piraeus releases"))
    except json.JSONDecodeError as exc:
        raise ValueError("Could not parse Piraeus releases") from exc
    if not isinstance(releases, list):
        raise ValueError("Unexpected Piraeus releases structure")

    newest: dict[tuple[int, int], Version] = {}
    for release in releases:
        if not isinstance(release, dict):
            raise ValueError("Malformed Piraeus release entry")
        if release.get("draft") or release.get("prerelease"):
            continue
        tag = str(release.get("tag_name", "")).strip().lstrip("v")
        try:
            version = Version(tag)
        except InvalidVersion:
            continue
        if version.is_prerelease or version.is_devrelease or version < MIN_VERSION:
            continue
        key = (version.major, version.minor)
        if key not in newest or version > newest[key]:
            newest[key] = version

    if not newest:
        raise ValueError("No stable supported Piraeus releases found")
    return [str(newest[key]) for key in sorted(newest, reverse=True)]


def parse_min_kubernetes(markdown: bytes | str) -> str:
    match = _KUBE_BADGE_RE.search(_decode_text(markdown, "Piraeus README"))
    if not match:
        raise ValueError("Piraeus minimum Kubernetes version not found")
    return match.group(1)


def parse_chart_metadata(payload: bytes | str, release_version: str) -> str:
    try:
        chart = yaml.safe_load(_decode_text(payload, "Piraeus Chart.yaml"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Piraeus Chart.yaml") from exc
    if not isinstance(chart, dict):
        raise ValueError("Unexpected Piraeus Chart.yaml structure")

    chart_version = str(chart.get("version", "")).strip().lstrip("v")
    app_version = str(chart.get("appVersion", "")).strip().lstrip("v")
    if not chart_version or not app_version:
        raise ValueError("Piraeus chart version metadata is incomplete")
    if app_version != release_version:
        raise ValueError("Piraeus chart appVersion does not match release")
    return chart_version


def _minor(value: str) -> int:
    match = re.fullmatch(r"1\.(\d+)", value.strip())
    if not match:
        raise ValueError(f"Unsupported Kubernetes version: {value!r}")
    return int(match.group(1))


def expand_minimum(minimum: str, current: str) -> list[str]:
    start = _minor(minimum)
    end = _minor(current)
    if start > end:
        raise ValueError(
            f"Piraeus minimum Kubernetes {minimum} is newer than Plural {current}"
        )
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def build_rows(
    releases_payload: bytes | str,
    current_kube: str,
    fetcher,
) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []
    for version in stable_versions(releases_payload):
        readme = fetcher(README_URL.format(version=version))
        chart = fetcher(CHART_URL.format(version=version))
        if not readme or not chart:
            raise ValueError(f"Missing tagged Piraeus sources for {version}")
        minimum = parse_min_kubernetes(readme)
        chart_version = parse_chart_metadata(chart, version)
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", expand_minimum(minimum, current_kube)),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def scrape() -> None:
    from utils import current_kube_version, fetch_page, update_compatibility_info

    releases = fetch_page(f"{RELEASES_URL}?per_page=100")
    if not releases:
        raise ValueError("Could not fetch official Piraeus releases")
    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    rows = build_rows(releases, current, fetch_page)
    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml",
        rows,
    )
