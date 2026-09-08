"""Knative minor-cut compatibility policy; see ../knative-operator.md."""

from __future__ import annotations

from datetime import date, datetime, timezone
import json
import re
from urllib.request import Request, urlopen

import yaml

SCHEDULE_URL = "https://raw.githubusercontent.com/knative/community/main/mechanics/RELEASE-SCHEDULE.md"
INDEX_URL = "https://knative.github.io/operator/index.yaml"
KUBERNETES_STABLE_URL = "https://dl.k8s.io/release/stable.txt"
TARGET_FILE = "../../static/compatibilities/knative-operator.yaml"
REQUEST_TIMEOUT = 30

NUMBER = r"(?:0|[1-9][0-9]*)"
MINOR = re.compile(rf"v?({NUMBER}\.{NUMBER})")
SEMVER = re.compile(
    rf"v?({NUMBER}\.{NUMBER}\.{NUMBER})"
    r"(?P<prerelease>-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?P<build>\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
)


class UniqueKeyLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        keys = [self.construct_object(key, deep=deep) for key, _ in node.value]
        if len(keys) != len(set(keys)):
            raise ValueError("Duplicate Helm index YAML keys")
        return super().construct_mapping(node, deep=deep)


def _version(value):
    match = SEMVER.fullmatch(value) if isinstance(value, str) else None
    if match is None:
        raise ValueError(f"Invalid stable version: {value!r}")
    return match


def _version_key(value):
    return tuple(int(part) for part in _version(value)[1].split("."))


def _minor_key(value):
    match = MINOR.fullmatch(value) if isinstance(value, str) else None
    if match is None:
        raise ValueError(f"Invalid Kubernetes minor: {value!r}")
    return tuple(int(part) for part in match[1].split("."))


def parse_schedule(markdown):
    releases = {}
    columns = None
    width = 0
    required = ("Release", "Min K8s Version", "Date")
    for line in markdown.splitlines():
        if not line.strip().startswith("|"):
            columns = None
            continue
        cells = [" ".join(cell.split()) for cell in line.strip().strip("|").split("|")]
        if "Release" in cells or "Min K8s Version" in cells:
            if any(cells.count(header) != 1 for header in required):
                raise ValueError("Missing or duplicate required schedule headers")
            columns = tuple(cells.index(header) for header in required)
            width = len(cells)
            continue
        if columns is None:
            continue
        if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        if len(cells) != width:
            raise ValueError(f"Invalid schedule row: {line.strip()}")
        release = MINOR.fullmatch(cells[columns[0]])
        minimum = MINOR.fullmatch(cells[columns[1]])
        if release is None or minimum is None:
            raise ValueError(f"Invalid schedule version: {line.strip()}")
        info = {"minimum": minimum[1], "date": date.fromisoformat(cells[columns[2]])}
        key = release[1]
        if key in releases and releases[key] != info:
            raise ValueError(f"Conflicting schedule entries for Knative {key}")
        releases[key] = info
    if not releases:
        raise ValueError("No Knative release schedule rows found")
    return releases


def parse_charts(index_yaml):
    try:
        index = yaml.load(index_yaml, Loader=UniqueKeyLoader)
    except (yaml.YAMLError, TypeError) as error:
        raise ValueError(f"Invalid Helm index YAML: {error}") from error
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get("knative-operator") if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("No knative-operator chart entries found")
    by_chart = {}
    by_app = {}
    for entry in charts:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Helm chart entry")
        chart = _version(entry.get("version"))
        app = _version(entry.get("appVersion"))
        if chart["prerelease"] or app["prerelease"]:
            continue
        if app["build"] or chart["build"]:
            raise ValueError("Build metadata is unsupported by the compatibility updater")
        chart_version = entry["version"]
        app_version = entry["appVersion"].removeprefix("v")
        chart_identity = chart_version.removeprefix("v")
        if chart_identity in by_chart and by_chart[chart_identity] != app_version:
            raise ValueError(f"Conflicting application versions for chart {chart_version}")
        by_chart[chart_identity] = app_version
        current = by_app.get(app_version)
        if current is None or (_version_key(chart_version), chart_version) > (
            _version_key(current), current,
        ):
            by_app[app_version] = chart_version
    if not by_app:
        raise ValueError("No stable Knative Operator charts found")
    return [
        {"version": app, "chart_version": by_app[app]}
        for app in sorted(by_app, key=lambda app: (_version_key(app), app), reverse=True)
    ]


def parse_kubernetes_release(payload, expected_tag):
    if not isinstance(expected_tag, str) or not re.fullmatch(rf"v1\.{NUMBER}\.0", expected_tag):
        raise ValueError(f"Expected a Kubernetes v1 minor GA tag, got {expected_tag}")
    expected = _version(expected_tag)
    if expected["prerelease"] or expected["build"] or _version_key(expected_tag)[2] != 0:
        raise ValueError(f"Expected a Kubernetes GA tag, got {expected_tag}")
    if not isinstance(payload, dict) or payload.get("tag_name") != expected_tag:
        raise ValueError(f"Unexpected Kubernetes release record for {expected_tag}")
    if payload.get("draft") is not False or payload.get("prerelease") is not False:
        raise ValueError(f"Kubernetes {expected_tag} is not a published stable release")
    published = payload.get("published_at")
    if not isinstance(published, str):
        raise ValueError(f"Missing publication date for Kubernetes {expected_tag}")
    timestamp = datetime.fromisoformat(published.replace("Z", "+00:00"))
    if timestamp.tzinfo is None:
        raise ValueError(f"Missing publication timezone for Kubernetes {expected_tag}")
    minor = ".".join(expected[1].split(".")[:2])
    return minor, timestamp.astimezone(timezone.utc).date()


def _required_releases(schedule, charts):
    releases = []
    for chart in charts:
        minor = ".".join(_version(chart["version"])[1].split(".")[:2])
        if minor not in schedule:
            raise ValueError(f"No documented release schedule for Knative {minor}")
        releases.append(schedule[minor])
    return releases


def build_versions(schedule_text, index_text, kubernetes_releases):
    schedule = parse_schedule(schedule_text)
    charts = parse_charts(index_text)
    required = _required_releases(schedule, charts)
    if not isinstance(kubernetes_releases, dict) or not kubernetes_releases:
        raise ValueError("No Kubernetes GA history supplied")
    history = sorted(kubernetes_releases, key=_minor_key)
    previous = None
    for minor in history:
        key = _minor_key(minor)
        published = kubernetes_releases[minor]
        if type(published) is not date:
            raise ValueError(f"Invalid Kubernetes publication date for {minor}")
        if previous is not None:
            if key != (previous[0][0], previous[0][1] + 1) or published <= previous[1]:
                raise ValueError("Incomplete or nonmonotonic Kubernetes GA history")
        previous = key, published
    versions = []
    for chart, release in zip(charts, required):
        floor = release["minimum"]
        if floor not in kubernetes_releases or kubernetes_releases[floor] > release["date"]:
            raise ValueError(f"Kubernetes minimum {floor} was not released by the Knative cut")
        supported = [minor for minor in reversed(history)
                     if _minor_key(minor) >= _minor_key(floor)
                     and kubernetes_releases[minor] <= release["date"]]
        versions.append({**chart, "kube": supported, "requirements": [], "incompatibilities": []})
    return versions


def fetch_text(url):
    request = Request(url, headers={"User-Agent": "plural-knative-compatibility-scraper"})
    with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        return response.read().decode("utf-8")


def scrape():
    from utils import print_error, update_compatibility_info

    try:
        schedule_text = fetch_text(SCHEDULE_URL)
        index_text = fetch_text(INDEX_URL)
        releases = _required_releases(parse_schedule(schedule_text), parse_charts(index_text))
        floor = min((_minor_key(release["minimum"]) for release in releases))
        marker = fetch_text(KUBERNETES_STABLE_URL).strip()
        stable = _version(marker)
        if stable["prerelease"] or stable["build"]:
            raise ValueError("Kubernetes stable marker must identify a stable release")
        latest = _version_key(marker)[:2]
        if latest[0] != floor[0] or not 0 <= latest[1] - floor[1] <= 100:
            raise ValueError("Unsupported Kubernetes GA history bounds")
        history = {}
        for minor in range(floor[1], latest[1] + 1):
            tag = f"v{floor[0]}.{minor}.0"
            url = f"https://api.github.com/repos/kubernetes/kubernetes/releases/tags/{tag}"
            key, published = parse_kubernetes_release(json.loads(fetch_text(url)), tag)
            history[key] = published
        versions = build_versions(schedule_text, index_text, history)
    except (OSError, UnicodeError, ValueError) as error:
        print_error(f"Unable to refresh Knative Operator compatibility: {error}")
        return
    update_compatibility_info(TARGET_FILE, versions)
