import re
import io
import tarfile
from collections import OrderedDict

import yaml
from packaging.version import Version

from utils import (
    fetch_page,
    print_error,
    update_compatibility_info,
)


APP_NAME = "cluster-autoscaler"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/README.md"
HELM_REPO_URL = "https://kubernetes.github.io/autoscaler"
CHART_NAME = "cluster-autoscaler"
IMAGE_REPOSITORY = "registry.k8s.io/autoscaling/cluster-autoscaler"
MIN_EXACT_MINOR = Version("1.12.0")
REQUIREMENT = (
    "Use the Cluster Autoscaler release that corresponds to the Kubernetes "
    "control-plane minor version."
)


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _minor_key(version):
    parsed = Version(version)
    return f"{parsed.major}.{parsed.minor}"


def parse_compatibility_table(content):
    rows = {}
    in_table = False

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if stripped.startswith("| Kubernetes Version | CA Version"):
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

        kube_match = re.search(r"(\d+\.\d+)", columns[0])
        autoscaler_match = re.search(r"(\d+\.\d+)", columns[1])
        if not kube_match or not autoscaler_match:
            continue

        rows[autoscaler_match.group(1)] = kube_match.group(1)

    return rows


def get_chart_releases(index_content):
    index_yaml = yaml.safe_load(index_content)
    entries = index_yaml.get("entries", {}).get(CHART_NAME, [])
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

        current = chart_releases.get(app_version)
        if not current or Version(chart_version) > Version(current["chart_version"]):
            chart_releases[app_version] = {
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
        print_error(f"Failed to read Cluster Autoscaler chart defaults: {error}")
        return fallback_image(app_version)

    image = values.get("image", {})
    repository = image.get("repository") or IMAGE_REPOSITORY
    tag = str(image.get("tag") or chart.get("appVersion") or app_version)
    if not tag.startswith("v"):
        tag = f"v{tag}"

    return f"{repository}:{tag}"


def extract_table_data(compatibility_by_minor, chart_releases):
    latest_by_minor = {}

    for app_version, chart in chart_releases.items():
        parsed = Version(app_version)
        if parsed.major != 1:
            continue

        minor = _minor_key(app_version)
        kube_version = compatibility_by_minor.get(minor)
        if not kube_version and parsed >= MIN_EXACT_MINOR:
            kube_version = minor
        if not kube_version:
            continue

        existing = latest_by_minor.get(minor)
        if existing and Version(existing["version"]) > parsed:
            continue

        latest_by_minor[minor] = OrderedDict(
            [
                ("version", app_version),
                ("kube", [kube_version]),
                ("requirements", [REQUIREMENT]),
                ("incompatibilities", []),
                ("chart_version", chart["chart_version"]),
                ("images", [get_default_image(chart["url"], app_version)]),
            ]
        )

    return list(latest_by_minor.values())


def scrape():
    compatibility_content = fetch_page(COMPATIBILITY_URL)
    if not compatibility_content:
        return
    compatibility_by_minor = parse_compatibility_table(compatibility_content)
    if not compatibility_by_minor:
        print_error("No Cluster Autoscaler compatibility table found.")
        return

    chart_index = fetch_page(f"{HELM_REPO_URL}/index.yaml")
    if not chart_index:
        print_error("No Cluster Autoscaler Helm index found.")
        return
    chart_releases = get_chart_releases(chart_index)
    rows = extract_table_data(compatibility_by_minor, chart_releases)
    if not rows:
        print_error("No Cluster Autoscaler versions extracted.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
