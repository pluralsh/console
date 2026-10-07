from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version

app_name = "kuberay-operator"
helm_index_url = (
    "https://raw.githubusercontent.com/ray-project/kuberay-helm/"
    "gh-pages/index.yaml"
)
installation_url = (
    "https://raw.githubusercontent.com/ray-project/kuberay/"
    "v{version}/docs/deploy/installation.md"
)
MIN_CHART_VERSION = Version("0.4.0")

_MIN_KUBE_RE = re.compile(
    r"Kubernetes\s+cluster\s+and\s+Kubectl\s+are\s+both\s+at\s+version\s+at\s+least\s+"
    r"(1\.\d+)",
    re.IGNORECASE,
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


def parse_min_kubernetes(markdown: str) -> str:
    match = _MIN_KUBE_RE.search(markdown)
    if not match:
        raise ValueError("KubeRay minimum Kubernetes version not found")
    return match.group(1)


def _parse_kube_minor(version: str) -> int:
    match = re.fullmatch(r"1\.(\d+)", version.strip())
    if not match:
        raise ValueError(f"Unsupported Kubernetes version: {version!r}")
    return int(match.group(1))


def expand_minimum(minimum: str, current: str) -> list[str]:
    start = _parse_kube_minor(minimum)
    end = _parse_kube_minor(current)
    if start > end:
        raise ValueError(
            f"KubeRay minimum Kubernetes {minimum} is newer than Plural {current}"
        )
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def stable_charts_by_minor(
    index_payload: bytes | str,
) -> list[list[tuple[str, str]]]:
    """Return stable chart releases grouped by minor, newest first.

    Some historical Helm chart releases do not have the installation document
    at the corresponding Git tag. Keeping every stable patch in a minor lets
    build_rows fall back to the newest exact release that has authoritative
    tagged documentation instead of guessing compatibility for an undocumented
    chart release.
    """
    index_text = _decode_text(index_payload, "KubeRay Helm index")
    try:
        index = yaml.safe_load(index_text)
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse KubeRay Helm index") from exc

    if not isinstance(index, dict):
        raise ValueError("Unexpected KubeRay Helm index structure")

    entries = index.get("entries", {}).get(app_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError("KubeRay operator chart entries not found")

    grouped: dict[tuple[int, int], list[tuple[Version, str]]] = {}
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed KubeRay operator chart entry")

        raw_version = str(entry.get("version", "")).strip().lstrip("v")
        if not raw_version or raw_version in seen:
            continue
        try:
            parsed = Version(raw_version)
        except InvalidVersion:
            continue

        if (
            parsed.is_prerelease
            or parsed.is_devrelease
            or parsed < MIN_CHART_VERSION
        ):
            continue

        seen.add(raw_version)
        grouped.setdefault((parsed.major, parsed.minor), []).append(
            (parsed, raw_version)
        )

    if not grouped:
        raise ValueError("No stable supported KubeRay operator charts found")

    result: list[list[tuple[str, str]]] = []
    for key in sorted(grouped, reverse=True):
        candidates = sorted(grouped[key], key=lambda item: item[0], reverse=True)
        result.append([(str(parsed), chart_version) for parsed, chart_version in candidates])
    return result


def build_rows(
    index_payload: bytes | str,
    current_kube: str,
    fetcher,
) -> list[OrderedDict[str, object]]:
    rows: list[OrderedDict[str, object]] = []

    for candidates in stable_charts_by_minor(index_payload):
        documented: tuple[str, str, str] | None = None
        for version, chart_version in candidates:
            url = installation_url.format(version=version)
            page = fetcher(url)
            if not page:
                # A missing tagged document is not evidence for this release.
                # Try an older stable patch in the same minor instead.
                continue
            markdown = _decode_text(
                page, f"KubeRay {version} installation documentation"
            )
            minimum = parse_min_kubernetes(markdown)
            documented = (version, chart_version, minimum)
            break

        if documented is None:
            # Do not manufacture compatibility for a minor with no tagged
            # installation documentation at any published stable chart release.
            continue

        version, chart_version, minimum = documented
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
        raise ValueError("No documented KubeRay compatibility rows generated")
    return rows


def scrape() -> None:
    from utils import current_kube_version, fetch_page, update_compatibility_info

    index = fetch_page(helm_index_url)
    if not index:
        raise ValueError("Could not fetch official KubeRay Helm index")

    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    rows = build_rows(index, current, fetch_page)
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
