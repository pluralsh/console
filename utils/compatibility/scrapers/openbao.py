from __future__ import annotations

import re
import tarfile
from collections import OrderedDict
from io import BytesIO
from urllib.parse import urljoin

import yaml

from utils import (
    current_kube_version,
    fetch_page,
    print_error,
    update_compatibility_info,
    validate_semver,
)


APP_NAME = "openbao"
CHART_NAME = "openbao"
HELM_INDEX_URL = "https://openbao.github.io/openbao-helm/index.yaml"
OUTPUT_PATH = f"../../static/compatibilities/{APP_NAME}.yaml"


def _clean_version(raw):
    version = validate_semver(str(raw).strip().lstrip("v"))
    return str(version) if version else None


def _version_tuple(major, minor, patch=0):
    return int(major), int(minor), int(patch or 0)


def _next_minor(major, minor):
    return major, minor + 1


def _parse_constraints(spec):
    constraints = []
    normalized = spec.replace(",", " ")

    for operator, major, minor, patch in re.findall(
        r"(>=|<=|<|>|=)?\s*v?(\d+)\.(\d+)(?:\.(\d+))?",
        normalized,
    ):
        constraints.append((operator or ">=", _version_tuple(major, minor, patch)))

    return constraints


def _minor_bounds(version):
    parsed = validate_semver(version)
    if not parsed:
        return None
    return parsed.major, parsed.minor


def _minor(version):
    parsed = validate_semver(version)
    if not parsed:
        return None
    return f"{parsed.major}.{parsed.minor}"


def _minor_satisfies_constraints(major, minor, constraints):
    start = (major, minor, 0)
    end = (*_next_minor(major, minor), 0)

    for operator, bound in constraints:
        if operator in (">=", ">"):
            if end <= bound:
                return False
        elif operator == "<":
            if start >= bound:
                return False
        elif operator == "<=":
            if start > bound:
                return False
        elif operator == "=":
            if not (start <= bound < end):
                return False

    return True


def parse_kube_constraint(spec, latest_kube):
    if not spec or not latest_kube:
        return []

    latest = _minor_bounds(latest_kube)
    if not latest:
        return []

    constraints = _parse_constraints(spec)
    lower_bounds = [
        (bound[0], bound[1])
        for operator, bound in constraints
        if operator in (">=", ">", "=")
    ]
    if not constraints or not lower_bounds:
        return []

    major, minor = max(lower_bounds)
    kube_versions = []

    while (major, minor) <= latest:
        if _minor_satisfies_constraints(major, minor, constraints):
            kube_versions.append(f"{major}.{minor}")
        major, minor = _next_minor(major, minor)

    return kube_versions


def load_index(content):
    try:
        index = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse OpenBao Helm index: {exc}")
        return None

    if not isinstance(index, dict):
        print_error("Unexpected OpenBao Helm index format.")
        return None

    return index


def _chart_url(entry):
    urls = entry.get("urls") or []
    if not urls:
        return None

    url = urls[0]
    if url.startswith("http"):
        return url
    return urljoin("https://openbao.github.io/openbao-helm/", url)


def _format_image(image_config, app_version):
    registry = image_config.get("registry") or "docker.io"
    repository = image_config.get("repository")
    if not repository:
        return None

    tag = image_config.get("tag") or app_version
    return f"{registry}/{repository}:{tag}"


def extract_default_images(chart_content, app_version):
    try:
        with tarfile.open(fileobj=BytesIO(chart_content), mode="r:gz") as archive:
            values_file = archive.extractfile("openbao/values.yaml")
            if not values_file:
                return []
            values = yaml.safe_load(values_file.read())
    except (tarfile.TarError, yaml.YAMLError, OSError):
        return []

    images = {
        _format_image(values.get("server", {}).get("image", {}), app_version),
        _format_image(values.get("injector", {}).get("image", {}), app_version),
    }
    return sorted(image for image in images if image)


def extract_rows(index_yaml, latest_kube):
    rows_by_version = {}
    entries = index_yaml.get("entries", {}).get(CHART_NAME, [])

    for entry in entries:
        app_version = _clean_version(entry.get("appVersion", ""))
        chart_version = _clean_version(entry.get("version", ""))
        if not app_version or not chart_version:
            continue

        kube_versions = parse_kube_constraint(entry.get("kubeVersion", ""), latest_kube)
        if not kube_versions:
            continue

        current = rows_by_version.get(app_version)
        if current and validate_semver(chart_version) <= validate_semver(current["chart_version"]):
            continue

        chart_url = _chart_url(entry)
        chart_content = fetch_page(chart_url) if chart_url else None
        images = extract_default_images(chart_content, app_version) if chart_content else []

        rows_by_version[app_version] = OrderedDict(
            [
                ("version", app_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", images),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )

    rows = sorted(
        rows_by_version.values(),
        key=lambda row: validate_semver(row["version"]),
        reverse=True,
    )
    return _representative_rows(rows)


def _representative_rows(rows):
    selected = []
    seen = {}

    for row in rows:
        minor = _minor(row["version"])
        if not minor:
            continue

        kube = tuple(row["kube"])
        if minor not in seen:
            selected.append(row)
            seen[minor] = kube
            continue

        if seen[minor] != kube:
            selected.append(row)
            seen[minor] = kube

    return selected


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    content = fetch_page(HELM_INDEX_URL)
    if not content:
        return

    index_yaml = load_index(content)
    if not index_yaml:
        return

    rows = extract_rows(index_yaml, latest_kube)
    if not rows:
        print_error("No OpenBao versions extracted from Helm index.")
        return

    update_compatibility_info(OUTPUT_PATH, rows)
