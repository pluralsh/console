"""Build Tetragon compatibility rows from release-tagged upstream sources."""

from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version


APP_NAME = "tetragon"
CHART_NAME = "tetragon"
HELM_INDEX_URL = "https://helm.cilium.io/index.yaml"
CHART_URL = (
    "https://raw.githubusercontent.com/cilium/tetragon/"
    "{tag}/install/kubernetes/tetragon/Chart.yaml"
)
VERSION_URL = (
    "https://raw.githubusercontent.com/cilium/tetragon/"
    "{tag}/pkg/k8s/version/version.go"
)
OUTPUT_PATH = f"../../static/compatibilities/{APP_NAME}.yaml"

_MINIMUM_VERSION_RE = re.compile(
    r"\bMinimalVersionConstraint\s*=\s*[\"'](v?\d+\.\d+\.\d+)[\"']"
)


def _decode(payload: bytes | str, source: str) -> str:
    if isinstance(payload, bytes):
        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Could not decode {source}") from exc
    if isinstance(payload, str):
        return payload
    raise ValueError(f"Unexpected {source} payload type")


def _stable_version(value: object) -> Version | None:
    if not isinstance(value, str):
        return None
    raw = value.strip().lstrip("v")
    try:
        parsed = Version(raw)
    except InvalidVersion:
        return None
    if parsed.is_prerelease or parsed.is_devrelease:
        return None
    return parsed


def _release_version(value: object) -> str | None:
    raw = value[0] if isinstance(value, (tuple, list)) else value
    parsed = _stable_version(raw)
    return str(parsed) if parsed else None


def parse_chart_identity(content: bytes | str) -> tuple[str, str]:
    """Return the stable chart and application versions from Chart.yaml."""
    text = _decode(content, "Tetragon Chart.yaml")
    try:
        chart = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Tetragon Chart.yaml") from exc

    if not isinstance(chart, dict):
        raise ValueError("Unexpected Tetragon Chart.yaml structure")

    name = chart.get("name")
    chart_version = _stable_version(chart.get("version"))
    app_version = _stable_version(chart.get("appVersion"))
    if (
        name != CHART_NAME
        or not chart_version
        or not app_version
        or chart_version != app_version
    ):
        raise ValueError("Tetragon chart identity is incomplete or unstable")
    return str(chart_version), str(app_version)


def parse_chart_index(content: bytes | str) -> dict[str, str]:
    """Map stable Tetragon application versions to their chart versions."""
    text = _decode(content, "Tetragon Helm index")
    try:
        index = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Tetragon Helm index") from exc

    entries = (
        index.get("entries", {}).get(CHART_NAME)
        if isinstance(index, dict)
        else None
    )
    if not isinstance(entries, list):
        raise ValueError("Tetragon Helm chart entries not found")

    versions: dict[str, tuple[Version, str]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed Tetragon Helm chart entry")
        chart_version = _stable_version(entry.get("version"))
        app_version = _stable_version(entry.get("appVersion"))
        if not chart_version or not app_version:
            continue
        app_key = str(app_version)
        current = versions.get(app_key)
        if current is None or chart_version > current[0]:
            versions[app_key] = (chart_version, str(chart_version))

    if not versions:
        raise ValueError("No stable Tetragon Helm chart entries found")
    return {app: chart for app, (_, chart) in versions.items()}


def parse_minimum_kubernetes(content: bytes | str) -> str:
    """Read Tetragon's release-tagged minimum Kubernetes minor version."""
    text = _decode(content, "Tetragon version source")
    match = _MINIMUM_VERSION_RE.search(text)
    if not match:
        raise ValueError("Tetragon minimum Kubernetes constraint not found")

    version = _stable_version(match.group(1))
    if not version or version.major != 1:
        raise ValueError("Tetragon minimum Kubernetes constraint is invalid")
    return f"{version.major}.{version.minor}"


def _minor_number(value: str) -> int:
    match = re.fullmatch(r"1\.(\d+)", value.strip().lstrip("v"))
    if not match:
        raise ValueError(f"Unsupported Kubernetes minor version: {value!r}")
    return int(match.group(1))


def expand_minimum(minimum: str, current: str) -> list[str]:
    """Expand a documented floor through Plural's current Kubernetes ceiling."""
    start = _minor_number(minimum)
    end = _minor_number(current)
    if start > end:
        raise ValueError(
            f"Tetragon minimum Kubernetes {minimum} is newer than Plural {current}"
        )
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def stable_releases(releases) -> list[str]:
    """Return unique stable release versions, newest first."""
    versions = {_release_version(release) for release in releases}
    versions.discard(None)
    return sorted(versions, key=Version, reverse=True)


def build_rows(releases, chart_index, fetcher, current_kube: str) -> list[OrderedDict]:
    """Build rows only when release, chart, and source evidence agree."""
    charts = (
        parse_chart_index(chart_index)
        if not isinstance(chart_index, dict)
        else chart_index
    )
    rows: list[OrderedDict] = []

    for version in stable_releases(releases):
        chart_version = charts.get(version)
        if not chart_version:
            continue

        tag = f"v{version}"
        chart = fetcher(CHART_URL.format(tag=tag))
        source = fetcher(VERSION_URL.format(tag=tag))
        if not chart or not source:
            # A missing source is not evidence for compatibility. Preserve the
            # ability to process other release tags instead of guessing.
            continue

        tagged_chart, tagged_app = parse_chart_identity(chart)
        if tagged_app != version or tagged_chart != chart_version:
            raise ValueError(
                "Tetragon release/chart identity mismatch for "
                f"{version}: index {chart_version}, tag {tagged_chart}/{tagged_app}"
            )

        minimum = parse_minimum_kubernetes(source)
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

    if not rows:
        raise ValueError("No chart-backed Tetragon compatibility rows generated")
    return rows


def scrape() -> None:
    from utils import (
        current_kube_version,
        fetch_page,
        get_github_releases_timestamps,
        update_compatibility_info,
    )

    index = fetch_page(HELM_INDEX_URL)
    if not index:
        raise ValueError("Could not fetch the official Tetragon Helm index")

    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    releases = get_github_releases_timestamps("cilium", "tetragon")
    rows = build_rows(releases, index, fetch_page, current)
    update_compatibility_info(OUTPUT_PATH, rows)
