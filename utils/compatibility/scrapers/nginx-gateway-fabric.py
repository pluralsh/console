from collections import OrderedDict
import re

import requests
import yaml

from utils import (
    current_kube_version,
    ensure_keys,
    expand_kube_versions,
    print_error,
    print_success,
    read_yaml,
    reduce_versions,
    update_versions_data,
    fetch_page,
    validate_semver,
    write_yaml,
)


APP_NAME = "nginx-gateway-fabric"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/nginx/documentation/main/content/ngf/overview/technical-specifications.md"
CHART_VALUES_URL = "https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v{version}/charts/nginx-gateway-fabric/values.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(cell):
    return re.sub(r"\s+", " ", cell.strip().strip("`").replace("*", ""))


def _parse_kube_versions(value):
    cleaned = _clean_cell(value).lstrip("v")
    plus_match = re.fullmatch(r"(\d+\.\d+)\+", cleaned)
    if plus_match:
        return expand_kube_versions(plus_match.group(1), current_kube_version())

    range_match = re.fullmatch(r"(\d+\.\d+)\s*(?:-|–|—)\s*(\d+\.\d+)", cleaned)
    if range_match:
        return expand_kube_versions(range_match.group(1), range_match.group(2))

    version_match = re.fullmatch(r"\d+\.\d+", cleaned)
    return [cleaned] if version_match else []


def _image_from_config(config, fallback_repository, fallback_tag):
    image = config.get("image", {}) if isinstance(config, dict) else {}
    repository = image.get("repository") or fallback_repository
    tag = image.get("tag") or fallback_tag
    return f"{repository}:{tag}"


def _fallback_image_repositories(version):
    parsed = validate_semver(version)
    org = "nginxinc" if parsed and parsed.major == 1 and parsed.minor < 6 else "nginx"
    repository = f"ghcr.io/{org}/nginx-gateway-fabric"
    return repository, f"{repository}/nginx"


def _default_images(version):
    control_plane_repository, data_plane_repository = _fallback_image_repositories(version)
    fallbacks = [
        f"{control_plane_repository}:{version}",
        f"{data_plane_repository}:{version}",
    ]
    try:
        response = requests.get(CHART_VALUES_URL.format(version=version), timeout=10)
    except requests.RequestException:
        return fallbacks
    if response.status_code != 200:
        return fallbacks

    try:
        values = yaml.safe_load(response.text) or {}
    except yaml.YAMLError as exc:
        print_error(f"Failed to parse NGINX Gateway Fabric chart values: {exc}")
        return fallbacks

    control_plane = _image_from_config(
        values.get("nginxGateway", {}),
        control_plane_repository,
        version,
    )
    data_plane = _image_from_config(
        values.get("nginx", {}),
        data_plane_repository,
        version,
    )
    return [control_plane, data_plane]


def _write_compatibility_info(filepath, new_versions):
    data = read_yaml(filepath) or {}
    update_versions_data(data, [ensure_keys(version) for version in new_versions])
    data["versions"] = reduce_versions(data["versions"])
    if write_yaml(filepath, data):
        print_success(f"Updated compatibility info table: {filepath}")
    else:
        print_error(f"Failed to update compatibility info for {filepath}")


def extract_table_data(content):
    rows = []
    in_table = False

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if stripped.startswith("| NGINX Gateway Fabric | Gateway API | Kubernetes |"):
            in_table = True
            continue
        if in_table and not stripped.startswith("|"):
            break
        if not in_table or set(stripped.replace("|", "").strip()) <= {"-"}:
            continue

        columns = [_clean_cell(column) for column in stripped.strip("|").split("|")]
        if len(columns) < 3:
            continue
        app_version = columns[0].lstrip("v")
        if app_version.lower() == "edge":
            continue
        version = validate_semver(app_version)
        if not version:
            continue

        ver = str(version)
        kube_versions = _parse_kube_versions(columns[2])
        if not kube_versions:
            print_error(
                f"Could not parse Kubernetes versions for NGINX Gateway Fabric {ver}: {columns[2]}"
            )
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", ver),
                    ("kube", kube_versions),
                    ("chart_version", ver),
                    ("images", _default_images(ver)),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape():
    page_content = fetch_page(COMPATIBILITY_URL)
    if not page_content:
        return

    rows = extract_table_data(page_content)
    if not rows:
        print_error("No NGINX Gateway Fabric compatibility rows found.")
        return

    _write_compatibility_info(TARGET_FILE, rows)
