"""Build Goldilocks compatibility from Fairwinds' published Helm metadata."""

import re
from collections import OrderedDict

import requests
import yaml
from packaging.version import InvalidVersion, Version

from utils import current_kube_version, expand_kube_versions, update_compatibility_info

INDEX_URL = "https://charts.fairwinds.com/stable/index.yaml"
CHART_NAME = "goldilocks"
STABLE_VERSION = re.compile(r"\d+\.\d+\.\d+")
MINIMUM_KUBE = re.compile(r"^\s*>=\s*(\d+)\.(\d+)(?:\.\d+)?(?:-0)?\s*$")


def parse_minimum_kube(constraint):
    if not isinstance(constraint, str):
        raise ValueError("Goldilocks kubeVersion must be a string")
    match = MINIMUM_KUBE.fullmatch(constraint)
    if not match:
        raise ValueError(f"Unsupported Goldilocks kubeVersion constraint: {constraint!r}")
    return f"{int(match.group(1))}.{int(match.group(2))}"


def kube_versions_from_floor(floor, latest):
    try:
        floor_version = Version(floor)
        latest_version = Version(latest)
    except InvalidVersion as exc:
        raise ValueError("Invalid Kubernetes version") from exc
    if floor_version.major != latest_version.major or floor_version > latest_version:
        raise ValueError(f"Unsupported Kubernetes range: {floor} through {latest}")
    return list(reversed(expand_kube_versions(floor, latest)))


def parse_index(content, latest_kube):
    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        raise ValueError("Invalid Fairwinds Helm index") from exc
    if not isinstance(index, dict):
        raise ValueError("Invalid Fairwinds Helm index")
    entries = index.get("entries", {}).get(CHART_NAME)
    if not isinstance(entries, list) or not entries:
        raise ValueError("Goldilocks chart entries not found")

    # The index is normally newest-first, but choose explicitly so ordering changes
    # cannot select an older chart for an application release.
    selected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Goldilocks chart entry")
        chart_version = str(entry.get("version", "")).lstrip("v")
        app_version = str(entry.get("appVersion", "")).lstrip("v")
        if not STABLE_VERSION.fullmatch(chart_version) or not STABLE_VERSION.fullmatch(app_version):
            continue
        if entry.get("deprecated") is True:
            continue

        constraint = entry.get("kubeVersion")
        # Older charts did not publish a Kubernetes constraint. Do not invent one.
        if not constraint:
            continue
        floor = parse_minimum_kube(constraint)
        kube_versions = kube_versions_from_floor(floor, latest_kube)
        candidate = OrderedDict(
            [
                ("version", app_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        previous = selected.get(app_version)
        if previous is None or Version(chart_version) > Version(previous["chart_version"]):
            selected[app_version] = candidate

    if not selected:
        raise ValueError("No stable Goldilocks charts with explicit kubeVersion metadata found")
    return sorted(selected.values(), key=lambda row: Version(row["version"]), reverse=True)


def fetch_index():
    response = requests.get(INDEX_URL, timeout=30)
    response.raise_for_status()
    return response.text


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        raise ValueError("Current Kubernetes version is unavailable")
    rows = parse_index(fetch_index(), latest_kube)
    update_compatibility_info("../../static/compatibilities/goldilocks.yaml", rows)
