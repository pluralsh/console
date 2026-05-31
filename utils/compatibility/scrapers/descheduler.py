import io
import re
import tarfile
from collections import OrderedDict

import yaml
from packaging.version import Version

from utils import (
    fetch_page,
    print_error,
    update_compatibility_info,
)


APP_NAME = "descheduler"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/kubernetes-sigs/descheduler/master/README.md"
HELM_REPO_URL = "https://kubernetes-sigs.github.io/descheduler"
CHART_NAME = "descheduler"
IMAGE_REPOSITORY = "registry.k8s.io/descheduler/descheduler"
MIN_SUPPORTED_VERSION = Version("0.18.0")
REQUIREMENT = (
    "Descheduler releases are tested against the three latest Kubernetes minor "
    "versions for that release."
)


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _minor_key(version):
    parsed = Version(version)
    return f"{parsed.major}.{parsed.minor}"


def expand_three_latest(kube_version):
    major, minor = [int(part) for part in kube_version.split(".")]
    return [f"{major}.{minor - offset}" for offset in range(3)]


def parse_compatibility_table(content):
    rows = {}
    in_table = False

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if stripped.startswith("| Descheduler | Supported Kubernetes Version"):
            in_table = True
            continue
        if not in_table:
            continue
        if not stripped.startswith("|"):
            if rows:
                break
            continue
        if set(stripped.replace("|", "").strip()) <= {"-"}:
            continue

        columns = [column.strip().strip("`") for column in stripped.strip("|").split("|")]
        if len(columns) < 2:
            continue

        descheduler_match = re.search(r"v?(\d+\.\d+)", columns[0])
        kube_match = re.search(r"v?(\d+\.\d+)", columns[1])
        if not descheduler_match or not kube_match:
            continue

        rows[descheduler_match.group(1)] = kube_match.group(1)

    return rows


def get_chart_releases(index_content):
    index_yaml = yaml.safe_load(index_content)
    if not isinstance(index_yaml, dict):
        print_error("Invalid Descheduler Helm index.")
        return {}

    chart_entries = index_yaml.get("entries") or {}
    if not isinstance(chart_entries, dict):
        print_error("Invalid Descheduler Helm index entries.")
        return {}

    entries = chart_entries.get(CHART_NAME) or []
    if not isinstance(entries, list):
        print_error("Invalid Descheduler chart entries.")
        return {}

    chart_releases = {}

    for entry in entries:
        app_version = str(entry.get("appVersion", "")).lstrip("v")
        chart_version = str(entry.get("version", "")).lstrip("v")
        chart_urls = entry.get("urls", [])
        if not app_version or not chart_version:
            continue
        try:
            Version(app_version)
            Version(chart_version)
        except ValueError:
            continue

        minor = _minor_key(app_version)
        current = chart_releases.get(minor)
        if not current or Version(chart_version) > Version(current["chart_version"]):
            chart_releases[minor] = {
                "app_version": app_version,
                "chart_version": chart_version,
                "url": chart_urls[0] if chart_urls else "",
            }

    return chart_releases


def read_chart_yaml(archive, filename):
    for member in archive.getmembers():
        if member.isfile() and member.name.split("/")[-1] == filename:
            extracted = archive.extractfile(member)
            if extracted:
                parsed = yaml.safe_load(extracted)
                return parsed if isinstance(parsed, dict) else {}
    return {}


def fallback_image(app_version):
    return f"{IMAGE_REPOSITORY}:v{app_version}"


def get_default_image(chart_url, app_version):
    if not chart_url:
        return fallback_image(app_version)

    content = fetch_page(chart_url)
    if not content:
        return fallback_image(app_version)

    try:
        with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as archive:
            chart = read_chart_yaml(archive, "Chart.yaml")
            values = read_chart_yaml(archive, "values.yaml")
    except (tarfile.TarError, yaml.YAMLError, OSError) as error:
        print_error(f"Failed to read Descheduler chart defaults: {error}")
        return fallback_image(app_version)

    image = values.get("image", {})
    repository = image.get("repository") or IMAGE_REPOSITORY
    tag = str(image.get("tag") or chart.get("appVersion") or app_version)
    if not tag.startswith("v"):
        tag = f"v{tag}"

    return f"{repository}:{tag}"


def extract_table_data(compatibility_by_minor, chart_releases):
    rows = []

    for minor, chart in chart_releases.items():
        app_version = chart["app_version"]
        parsed = Version(app_version)
        if parsed < MIN_SUPPORTED_VERSION:
            continue

        kube_version = compatibility_by_minor.get(minor)
        if not kube_version:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", expand_three_latest(kube_version)),
                    ("requirements", [REQUIREMENT]),
                    ("incompatibilities", []),
                    ("chart_version", chart["chart_version"]),
                    ("images", [get_default_image(chart["url"], app_version)]),
                ]
            )
        )

    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    compatibility_content = fetch_page(COMPATIBILITY_URL)
    if not compatibility_content:
        return
    compatibility_by_minor = parse_compatibility_table(compatibility_content)
    if not compatibility_by_minor:
        print_error("No Descheduler compatibility table found.")
        return

    chart_index = fetch_page(f"{HELM_REPO_URL}/index.yaml")
    if not chart_index:
        print_error("No Descheduler Helm index found.")
        return
    chart_releases = get_chart_releases(chart_index)
    rows = extract_table_data(compatibility_by_minor, chart_releases)
    if not rows:
        print_error("No Descheduler versions extracted.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
