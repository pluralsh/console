from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version

app_name = "falco-operator"
helm_index_url = "https://falcosecurity.github.io/charts/index.yaml"
release_readme_url = (
    "https://raw.githubusercontent.com/falcosecurity/falco-operator/"
    "v{version}/README.md"
)
MIN_APP_VERSION = Version("0.2.2")

_MIN_KUBE_RE = re.compile(
    r"native sidecar\s*\(Kubernetes\s+(1\.\d+)\+\)",
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
        raise ValueError("Falco Operator minimum Kubernetes version not found")
    return match.group(1)


def expand_minimum(minimum: str, current: str) -> list[str]:
    start_match = re.fullmatch(r"1\.(\d+)", minimum.strip())
    end_match = re.fullmatch(r"1\.(\d+)", current.strip())
    if not start_match or not end_match:
        raise ValueError("Unsupported Kubernetes version format")
    start = int(start_match.group(1))
    end = int(end_match.group(1))
    if start > end:
        raise ValueError(
            f"Falco Operator minimum Kubernetes {minimum} is newer than Plural {current}"
        )
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def stable_charts_by_app_minor(index_payload: bytes | str):
    index_text = _decode_text(index_payload, "Falco Helm index")
    try:
        index = yaml.safe_load(index_text)
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Falco Helm index") from exc
    if not isinstance(index, dict):
        raise ValueError("Unexpected Falco Helm index structure")
    entries = index.get("entries", {}).get(app_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError("Falco Operator chart entries not found")

    grouped = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed Falco Operator chart entry")
        raw_chart = str(entry.get("version", "")).strip().lstrip("v")
        raw_app = str(entry.get("appVersion", "")).strip().lstrip("v")
        try:
            chart_version = Version(raw_chart)
            app_version = Version(raw_app)
        except InvalidVersion:
            continue
        if chart_version.is_prerelease or app_version.is_prerelease:
            continue
        if app_version < MIN_APP_VERSION:
            continue
        key = (app_version.major, app_version.minor)
        grouped.setdefault(key, []).append((app_version, chart_version))

    if not grouped:
        raise ValueError("No stable supported Falco Operator charts found")

    result = []
    for key in sorted(grouped, reverse=True):
        result.append(sorted(grouped[key], reverse=True))
    return result

def build_rows(index_payload: bytes | str, current_kube: str, fetcher):
    rows: list[OrderedDict[str, object]] = []
    for candidates in stable_charts_by_app_minor(index_payload):
        documented = None
        for app_version, chart_version in candidates:
            url = release_readme_url.format(version=app_version)
            page = fetcher(url)
            if not page:
                continue
            markdown = _decode_text(page, f"Falco Operator {app_version} README")
            minimum = parse_min_kubernetes(markdown)
            documented = (app_version, chart_version, minimum)
            break
        if documented is None:
            continue

        app_version, chart_version, minimum = documented
        rows.append(
            OrderedDict(
                [
                    ("version", str(app_version)),
                    ("kube", expand_minimum(minimum, current_kube)),
                    ("chart_version", str(chart_version)),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if not rows:
        raise ValueError("No documented Falco Operator compatibility rows generated")
    return rows

def scrape() -> None:
    from utils import current_kube_version, fetch_page, update_compatibility_info

    index = fetch_page(helm_index_url)
    if not index:
        raise ValueError("Could not fetch official Falco Helm index")
    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    rows = build_rows(index, current, fetch_page)
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
