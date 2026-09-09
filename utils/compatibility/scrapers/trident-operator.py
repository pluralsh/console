"""Trident support bounds from release-tagged code, intersected with Helm constraints."""

import re
from collections import OrderedDict

import semantic_version
import requests
import yaml

from utils import fetch_page, print_error, update_compatibility_info

APP_NAME = "trident-operator"
INDEX_URL = "https://netapp.github.io/trident-helm-chart/index.yaml"
CONFIG_URL = "https://raw.githubusercontent.com/NetApp/trident/v{version}/config/config.go"


def version_parts(value):
    # Trident uses zero-padded calendar versions, including historical chart versions.
    if not isinstance(value, str):
        raise ValueError(f"Expected a release version string, got {value!r}")
    match = re.fullmatch(r"v?([0-9]+)\.([0-9]+)\.([0-9]+)([-+].*)?", value)
    if not match:
        raise ValueError(f"Invalid release version: {value!r}")
    parts = tuple(map(int, match.group(1, 2, 3)))
    suffix = match.group(4) or ""
    # Validate suffixes after normalizing the calendar-version core. Only a
    # well-formed prerelease may be skipped; malformed metadata must stop a refresh.
    try:
        parsed = semantic_version.Version(".".join(map(str, parts)) + suffix)
    except ValueError as exc:
        raise ValueError(f"Invalid release version: {value!r}") from exc
    if parsed.prerelease:
        return None
    if parsed.build:
        raise ValueError(f"Unsupported build metadata in release version: {value!r}")
    return parts


def parse_charts(content):
    index = yaml.safe_load(content)
    entries = index.get("entries", {}).get(APP_NAME) if isinstance(index, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("Trident chart entries not found")
    selected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed Trident chart entry")
        app = version_parts(entry.get("appVersion"))
        chart = version_parts(entry.get("version"))
        if not app or not chart:
            continue
        if entry.get("name") != APP_NAME:
            raise ValueError("Unexpected chart name")
        if not isinstance(entry.get("kubeVersion"), str):
            raise ValueError("Missing chart Kubernetes constraint")
        old = selected.get(app)
        if old is None or chart > version_parts(old["version"]):
            selected[app] = entry
        elif chart == version_parts(old["version"]) and entry != old:
            raise ValueError("Conflicting duplicate chart entries")
    if not selected:
        raise ValueError("No stable Trident chart releases")
    return [selected[key] for key in sorted(selected, reverse=True)]


def parse_supported_versions(content, chart_constraint):
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    # Ignore comments so commented-out or explanatory assignments cannot become support data.
    text = re.sub(r"/\*.*?\*/|//[^\n]*", "", text, flags=re.DOTALL)
    bounds = {}
    for name in ("Min", "Max"):
        matches = re.findall(
            rf'^\s*KubernetesVersion{name}\s*=\s*"v?(\d+)\.(\d+)(?:\.0)?"\s*$',
            text,
            re.MULTILINE,
        )
        if len(matches) != 1:
            raise ValueError(f"Expected one KubernetesVersion{name} assignment")
        bounds[name] = tuple(map(int, matches[0]))
    lower, upper = bounds["Min"], bounds["Max"]
    if lower[0] != 1 or upper[0] != 1 or lower > upper:
        raise ValueError("Unsupported or reversed Kubernetes range")
    # Only minor-version constraints can be represented by this catalog. Refuse a
    # future patch-sensitive constraint instead of advertising an entire minor.
    token = r"(?:>=|<)\s*v?\d+\.\d+\.0(?:-0)?"
    if not re.fullmatch(rf"\s*{token}(?:\s+{token})*\s*", chart_constraint):
        raise ValueError("Unsupported chart Kubernetes constraint")
    normalized = " ".join(re.sub(r"\s+", "", part) for part in re.findall(token, chart_constraint))
    spec = semantic_version.NpmSpec(normalized)
    versions = [
        f"1.{minor}"
        for minor in range(upper[1], lower[1] - 1, -1)
        if spec.match(semantic_version.Version(f"1.{minor}.0"))
        and spec.match(semantic_version.Version(f"1.{minor}.1"))
    ]
    if not versions:
        raise ValueError("Chart and application Kubernetes ranges do not overlap")
    return versions


def build_rows(content, fetch):
    rows = []
    for chart in parse_charts(content):
        original = str(chart["appVersion"]).removeprefix("v")
        url = CONFIG_URL.format(version=original)
        config = fetch(url)
        if not config:
            # Build everything before invoking the writer: a failed release fetch
            # must not publish a partially refreshed table.
            raise ValueError(f"Could not fetch release configuration: {url}")
        kube = parse_supported_versions(config, chart["kubeVersion"])
        rows.append(OrderedDict([
            ("version", ".".join(map(str, version_parts(original)))),
            ("kube", kube),
            ("chart_version", str(chart["version"])),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    return rows


def scrape():
    try:
        content = fetch_page(INDEX_URL)
        if not content:
            raise ValueError("Could not fetch Trident Helm index")
        rows = build_rows(content, fetch_page)
    except (ValueError, TypeError, yaml.YAMLError, requests.RequestException) as exc:
        print_error(f"Trident compatibility scrape failed: {exc}")
        return
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
