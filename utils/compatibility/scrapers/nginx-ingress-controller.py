import json
import re
from collections import OrderedDict

import requests
import yaml
from packaging.version import Version

from utils import (
    ensure_keys,
    expand_kube_versions,
    fetch_page,
    print_error,
    print_success,
    read_yaml,
    reduce_versions,
    update_versions_data,
    write_yaml,
)


APP_NAME = "nginx-ingress-controller"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/nginx/documentation/main/content/includes/nic/compatibility-tables/nic-k8s.md"
LATEST_RELEASE_URL = "https://api.github.com/repos/nginx/kubernetes-ingress/releases/latest"
CHART_YAML_URL = "https://raw.githubusercontent.com/nginx/kubernetes-ingress/v{version}/charts/nginx-ingress/Chart.yaml"
CHART_VALUES_URL = "https://raw.githubusercontent.com/nginx/kubernetes-ingress/v{version}/charts/nginx-ingress/values.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(value):
    return value.strip().strip("*").strip()


def _latest_release_versions():
    release_content = fetch_page(LATEST_RELEASE_URL)
    if not release_content:
        return None, None

    try:
        release = json.loads(_decode(release_content))
    except json.JSONDecodeError as exc:
        print_error(f"Failed to parse NGINX Ingress Controller release metadata: {exc}")
        return None, None

    version = str(release.get("tag_name", "")).lstrip("v")
    if not version:
        print_error("No NGINX Ingress Controller latest release tag found.")
        return None, None

    chart_content = fetch_page(CHART_YAML_URL.format(version=version))
    if not chart_content:
        return version, None

    try:
        chart = yaml.safe_load(_decode(chart_content))
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse NGINX Ingress Controller Chart.yaml: {exc}")
        return version, None

    return version, str(chart.get("version", ""))


def _fetch_yaml(url):
    try:
        response = requests.get(url, timeout=10)
    except requests.RequestException:
        return {}
    if response.status_code != 200:
        return {}

    try:
        parsed = yaml.safe_load(response.text)
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse NGINX Ingress Controller chart metadata: {exc}")
        return {}

    return parsed if isinstance(parsed, dict) else {}


def _resolve_shortcodes(value, latest_version, latest_chart_version):
    return (
        value.replace("{{< nic-version >}}", latest_version)
        .replace("{{< nic-helm-version >}}", latest_chart_version)
        .replace("{{< nic-operator-version >}}", "")
    )


def _kube_versions(value):
    match = re.search(r"(\d+\.\d+)\s*(?:-|–|—)\s*(\d+\.\d+)", value)
    if match:
        return expand_kube_versions(match.group(1), match.group(2))

    return [match.group(1) for match in re.finditer(r"(\d+\.\d+)", value)]


def _default_image(app_version):
    chart = _fetch_yaml(CHART_YAML_URL.format(version=app_version))
    values = _fetch_yaml(CHART_VALUES_URL.format(version=app_version))

    controller = values.get("controller", {}) if isinstance(values, dict) else {}
    image = controller.get("image", {}) if isinstance(controller, dict) else {}
    repository = image.get("repository") or "nginx/nginx-ingress"
    tag = image.get("tag") or chart.get("appVersion") or app_version

    return f"{repository}:{tag}"


def _table_rows(content, latest_version, latest_chart_version):
    rows = []

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        if set(stripped.replace("|", "").strip()) <= {"-"}:
            continue

        columns = [_clean_cell(column) for column in stripped.strip("|").split("|")]
        if len(columns) < 3 or columns[0] == "NIC version":
            continue

        app_version = _resolve_shortcodes(
            columns[0], latest_version, latest_chart_version
        )
        chart_version = _resolve_shortcodes(
            columns[2], latest_version, latest_chart_version
        )
        kube_versions = _kube_versions(columns[1])

        if not re.fullmatch(r"\d+\.\d+\.\d+", app_version):
            continue
        if not re.fullmatch(r"\d+\.\d+\.\d+", chart_version):
            continue
        if not kube_versions:
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", sorted(kube_versions, key=Version, reverse=True)),
                    ("requirements", []),
                    ("incompatibilities", []),
                    ("chart_version", chart_version),
                    ("images", [_default_image(app_version)]),
                ]
            )
        )

    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        print_error("Failed to fetch NGINX Ingress Controller compatibility table.")
        return

    latest_version, latest_chart_version = _latest_release_versions()
    if not latest_version or not latest_chart_version:
        print_error("Failed to resolve NGINX Ingress Controller latest chart version.")
        return

    rows = _table_rows(content, latest_version, latest_chart_version)
    if not rows:
        print_error("No NGINX Ingress Controller compatibility rows found.")
        return

    data = read_yaml(TARGET_FILE) or {}
    update_versions_data(data, [ensure_keys(row) for row in rows])
    data["versions"] = reduce_versions(data["versions"])

    if write_yaml(TARGET_FILE, data):
        print_success(f"Updated compatibility info table: {TARGET_FILE}")
    else:
        print_error(f"Failed to update compatibility info for {TARGET_FILE}")
