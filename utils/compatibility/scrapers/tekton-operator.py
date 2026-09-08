"""Generate Tekton Operator compatibility rows from first-party release metadata.

Source policy:
- Release-series Kubernetes floors come from tektoncd/operator's README table.
- Exact application/chart versions are accepted only when GitHub publishes BOTH
  the normal ``vX.Y.Z`` Operator release and the paired
  ``tekton-operator-X.Y.Z`` Helm-chart release.
- If a version-tagged Helm chart declares a stricter ``kubernetesMinVersion``,
  that chart-specific floor wins. This avoids overstating compatibility when the
  release-series table is broader than the packaged chart/runtime dependency.
- The effective lower bound is expanded only through Plural's current
  ``KUBE_VERSION``. This records upstream-declared support boundaries, not
  independent deployment testing of every intermediate Kubernetes minor.
"""

from __future__ import annotations

from collections import OrderedDict
import re
from typing import Iterable

from packaging.version import Version
import requests
import yaml

from utils import current_kube_version, fetch_page, print_error, update_compatibility_info

APP_NAME = "tekton-operator"
README_URL = "https://raw.githubusercontent.com/tektoncd/operator/main/README.md"
RELEASES_URL = "https://api.github.com/repos/tektoncd/operator/releases"
CHART_VALUES_URL = (
    "https://raw.githubusercontent.com/tektoncd/operator/"
    "tekton-operator-{version}/charts/tekton-operator/values.yaml"
)
TARGET_FILE = "../../static/compatibilities/tekton-operator.yaml"
OCI_MIN_VERSION = Version("0.80.0")

_SERIES_ROW_RE = re.compile(
    r"^\|\s*v(?P<series>\d+\.\d+)\.x(?:\s+LTS)?\s*\|\s*"
    r"(?P<kube>\d+\.\d+)\.x\s*\|",
    re.IGNORECASE,
)
_RUNTIME_TAG_RE = re.compile(r"^v(?P<version>\d+\.\d+\.\d+)$")
_CHART_TAG_RE = re.compile(r"^tekton-operator-(?P<version>\d+\.\d+\.\d+)$")
_KUBE_MIN_RE = re.compile(r"^v?(?P<major>\d+)\.(?P<minor>\d+)(?:\.\d+)?$")


def _decode(content: bytes | str, source: str = "Tekton Operator README") -> str:
    if isinstance(content, str):
        return content
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"Could not decode {source} as UTF-8") from exc


def parse_minimum_kubernetes(content: bytes | str) -> dict[str, str]:
    """Return ``operator major.minor -> minimum Kubernetes major.minor``."""

    text = _decode(content)
    result: dict[str, str] = {}
    for raw_line in text.splitlines():
        match = _SERIES_ROW_RE.match(raw_line.strip())
        if not match:
            continue
        series = match.group("series")
        kube = match.group("kube")
        if series in result and result[series] != kube:
            raise ValueError(
                f"Conflicting Kubernetes minimums for Tekton Operator {series}.x"
            )
        result[series] = kube

    if not result:
        raise ValueError("Tekton Operator release compatibility table not found")
    return result


def parse_chart_minimum(content: bytes | str) -> str | None:
    """Parse a chart-specific Kubernetes floor from a tagged values.yaml."""

    try:
        data = yaml.safe_load(_decode(content, "Tekton Operator chart values"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Tekton Operator chart values") from exc

    if not isinstance(data, dict):
        raise ValueError("Tekton Operator chart values are empty or malformed")

    value = data.get("kubernetesMinVersion")
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Tekton Operator kubernetesMinVersion is not a string")

    match = _KUBE_MIN_RE.fullmatch(value.strip())
    if not match:
        raise ValueError(
            f"Invalid Tekton Operator kubernetesMinVersion: {value!r}"
        )
    return f"{int(match.group('major'))}.{int(match.group('minor'))}"


def parse_release_records(pages: Iterable[list[dict]]) -> set[str]:
    """Return exact stable versions that have both runtime and Helm releases."""

    runtime: set[str] = set()
    charts: set[str] = set()

    for page in pages:
        if not isinstance(page, list):
            raise ValueError("Unexpected Tekton Operator releases API response")
        for release in page:
            if not isinstance(release, dict):
                raise ValueError("Unexpected Tekton Operator release record")
            if release.get("draft") or release.get("prerelease"):
                continue
            tag = release.get("tag_name")
            if not isinstance(tag, str):
                continue
            runtime_match = _RUNTIME_TAG_RE.fullmatch(tag)
            chart_match = _CHART_TAG_RE.fullmatch(tag)
            if runtime_match:
                runtime.add(runtime_match.group("version"))
            elif chart_match:
                charts.add(chart_match.group("version"))

    return runtime & charts


def expand_lower_bound(start: str, end: str) -> list[str]:
    """Expand an inclusive Kubernetes minor lower bound, newest first."""

    try:
        start_major, start_minor = (int(v) for v in start.split("."))
        end_major, end_minor = (int(v) for v in end.split("."))
    except Exception as exc:
        raise ValueError("Invalid Kubernetes minor version") from exc

    if start_major != end_major or start_minor > end_minor:
        raise ValueError(
            f"Unsupported Kubernetes range for Tekton Operator: {start} -> {end}"
        )
    return [f"{start_major}.{minor}" for minor in range(end_minor, start_minor - 1, -1)]


def stricter_minimum(series_minimum: str, chart_minimum: str | None) -> str:
    """Return the more conservative of the release-series and chart floors."""

    if chart_minimum is None:
        return series_minimum
    series = Version(f"{series_minimum}.0")
    chart = Version(f"{chart_minimum}.0")
    return chart_minimum if chart > series else series_minimum


def select_emittable_versions(
    minimums: dict[str, str], exact_versions: set[str]
) -> dict[str, str]:
    """Select the latest chart-backed patch for each documented release series."""

    by_series: dict[str, list[str]] = {}
    for version in exact_versions:
        try:
            parsed = Version(version)
        except Exception as exc:
            raise ValueError(f"Invalid Tekton Operator release version: {version}") from exc
        if parsed.pre or parsed.dev or parsed.local or parsed < OCI_MIN_VERSION:
            # The supported OCI chart distribution starts at v0.80.0.
            continue
        series = f"{parsed.major}.{parsed.minor}"
        if series in minimums:
            by_series.setdefault(series, []).append(version)

    selected = {
        series: max(candidates, key=Version)
        for series, candidates in by_series.items()
        if candidates
    }
    if not selected:
        raise ValueError(
            "No chart-backed Tekton Operator releases matched the compatibility table"
        )
    return selected


def build_rows(
    minimums: dict[str, str],
    exact_versions: set[str],
    kube_max: str,
    chart_minimums: dict[str, str | None] | None = None,
) -> list[OrderedDict[str, object]]:
    """Build rows from the exact versions eligible for catalog emission."""

    chart_minimums = chart_minimums or {}
    selected = select_emittable_versions(minimums, exact_versions)

    rows: list[OrderedDict[str, object]] = []
    for series, series_minimum in minimums.items():
        latest = selected.get(series)
        if latest is None:
            # Older documented releases can predate the supported OCI chart path.
            continue
        effective_minimum = stricter_minimum(
            series_minimum, chart_minimums.get(latest)
        )
        rows.append(
            OrderedDict(
                [
                    ("version", latest),
                    ("kube", expand_lower_bound(effective_minimum, kube_max)),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", latest),
                ]
            )
        )

    rows.sort(key=lambda row: Version(str(row["version"])), reverse=True)
    return rows


def fetch_release_pages(max_pages: int = 10) -> list[list[dict]]:
    pages: list[list[dict]] = []
    for page in range(1, max_pages + 1):
        response = requests.get(
            RELEASES_URL,
            params={"per_page": 100, "page": page},
            timeout=20,
            headers={"Accept": "application/vnd.github+json"},
        )
        if response.status_code != 200:
            raise ValueError(
                f"Tekton Operator releases API returned HTTP {response.status_code}"
            )
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Unexpected Tekton Operator releases API response")
        if not payload:
            break
        pages.append(payload)
        if len(payload) < 100:
            break
    if not pages:
        raise ValueError("Tekton Operator releases API returned no releases")
    return pages


def fetch_chart_minimum(version: str) -> str | None:
    response = requests.get(
        CHART_VALUES_URL.format(version=version),
        timeout=20,
        headers={"Accept": "text/plain"},
    )
    if response.status_code != 200:
        raise ValueError(
            f"Tekton Operator chart values for {version} returned HTTP {response.status_code}"
        )
    return parse_chart_minimum(response.content)


def scrape() -> None:
    try:
        readme = fetch_page(README_URL)
        if not readme:
            raise ValueError("Failed to fetch Tekton Operator README")
        minimums = parse_minimum_kubernetes(readme)
        exact_versions = parse_release_records(fetch_release_pages())
        selected_versions = select_emittable_versions(minimums, exact_versions)
        chart_minimums = {
            version: fetch_chart_minimum(version)
            for version in selected_versions.values()
        }
        kube_max = current_kube_version()
        if not kube_max:
            raise ValueError("Plural KUBE_VERSION is unavailable")
        rows = build_rows(minimums, exact_versions, kube_max, chart_minimums)
        update_compatibility_info(TARGET_FILE, rows)
    except Exception as exc:
        print_error(str(exc))


if __name__ == "__main__":
    scrape()
