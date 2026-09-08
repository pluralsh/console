from __future__ import annotations

import re
from collections import OrderedDict

from packaging.version import InvalidVersion, Version

APP_NAME = "kubevela"
DOC_URL = "https://raw.githubusercontent.com/kubevela/kubevela.github.io/main/docs/installation/kubernetes.mdx"
CHART_URL = "https://raw.githubusercontent.com/kubevela/kubevela/v{version}/charts/vela-core/Chart.yaml"

_RANGE_RE = re.compile(
    r"Kubernetes\s+cluster\s+`?>=\s*v?(1\.\d+)\s*&&\s*<=\s*v?(1\.\d+)`?",
    re.IGNORECASE,
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


def parse_kubernetes_range(document: bytes | str) -> tuple[str, str]:
    text = _decode(document, "KubeVela installation documentation")
    match = _RANGE_RE.search(text)
    if not match:
        raise ValueError("KubeVela Kubernetes range not found")
    return match.group(1), match.group(2)


def parse_chart_identity(chart: bytes | str) -> tuple[str, str]:
    text = _decode(chart, "KubeVela Chart.yaml")
    version = None
    app_version = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("version:") and version is None:
            version = line.split(":", 1)[1].strip().strip('"\'')
        elif line.startswith("appVersion:") and app_version is None:
            app_version = line.split(":", 1)[1].strip().strip('"\'')
    if not version or not app_version:
        raise ValueError("KubeVela chart identity is incomplete")
    if version.lstrip("v") != app_version.lstrip("v"):
        raise ValueError(
            f"KubeVela chart/app version mismatch: {version} != {app_version}"
        )
    return version.lstrip("v"), app_version.lstrip("v")


def _minor(value: str) -> int:
    match = re.fullmatch(r"1\.(\d+)", value.strip())
    if not match:
        raise ValueError(f"Unsupported Kubernetes version: {value!r}")
    return int(match.group(1))


def intersect_range(minimum: str, maximum: str, plural_current: str) -> list[str]:
    low = _minor(minimum)
    high = min(_minor(maximum), _minor(plural_current))
    if low > high:
        raise ValueError("KubeVela Kubernetes range does not intersect Plural support")
    return [f"1.{minor}" for minor in range(high, low - 1, -1)]


def latest_stable_release(releases) -> str:
    candidates: list[Version] = []
    for release in releases:
        raw = release[0] if isinstance(release, (tuple, list)) else release
        raw = str(raw).strip().lstrip("v")
        try:
            parsed = Version(raw)
        except InvalidVersion:
            continue
        if parsed.is_prerelease or parsed.is_devrelease:
            continue
        candidates.append(parsed)
    if not candidates:
        raise ValueError("No stable KubeVela release found")
    return str(max(candidates))


def build_row(version: str, docs: bytes | str, chart: bytes | str, current: str):
    chart_version, app_version = parse_chart_identity(chart)
    if app_version != version:
        raise ValueError(
            f"KubeVela release/chart mismatch: release {version}, chart {app_version}"
        )
    minimum, maximum = parse_kubernetes_range(docs)
    return OrderedDict(
        [
            ("version", version),
            ("kube", intersect_range(minimum, maximum, current)),
            ("chart_version", chart_version),
            ("requirements", []),
            ("incompatibilities", []),
        ]
    )


def scrape() -> None:
    from utils import (
        current_kube_version,
        fetch_page,
        get_github_releases_timestamps,
        update_compatibility_info,
    )

    releases = get_github_releases_timestamps("kubevela", "kubevela")
    version = latest_stable_release(releases)

    docs = fetch_page(DOC_URL)
    if not docs:
        raise ValueError("Could not fetch KubeVela installation documentation")

    chart = fetch_page(CHART_URL.format(version=version))
    if not chart:
        raise ValueError(f"Could not fetch KubeVela {version} Chart.yaml")

    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    row = build_row(version, docs, chart, current)
    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml",
        [row],
    )
