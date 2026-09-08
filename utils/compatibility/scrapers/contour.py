import re
from copy import deepcopy

import yaml
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    read_yaml,
    reduce_versions,
    validate_semver,
)

app_name = "contour"
compatibility_url = "https://projectcontour.io/resources/compatibility-matrix/"
target_file = f"../../static/compatibilities/{app_name}.yaml"
release_manifest_url = "https://raw.githubusercontent.com/projectcontour/contour/v{version}/examples/render/contour.yaml"
# Preserve the already-recorded history when removing the stale chart-only gate.
legacy_version_cutoff = validate_semver("1.32.1")


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if section.get_text(strip=True) in [
            "Compatibility Matrix",
        ]:
            table = section.find_next("table")
            if table:
                target_tables.append(table)
    return target_tables


def extract_table_data(target_tables):
    rows = []
    headers = [cell.get_text(" ", strip=True) for cell in target_tables[0].find_all("th")]
    try:
        version_index = headers.index("Contour Version")
        kube_index = headers.index("Kubernetes Versions")
    except ValueError:
        raise ValueError("Contour matrix is missing required column headers")
    for row in target_tables[0].find_all("tr")[1:]:  # Skip the header row
        columns = row.find_all("td")
        if not columns:
            continue
        if len(columns) <= max(version_index, kube_index):
            raise ValueError("Incomplete Contour compatibility row")
        version_text = columns[version_index].get_text(" ", strip=True)
        if not re.fullmatch(r"v?\d+\.\d+\.\d+", version_text):
            continue  # main and prereleases cannot establish a stable boundary.
        app_version = validate_semver(version_text.lstrip("v"))
        if not app_version:
            continue
        kube_versions = [value.strip() for value in columns[kube_index].get_text(" ", strip=True).split(",")]
        if not all(re.fullmatch(r"\d+\.\d+", value) for value in kube_versions):
            raise ValueError(f"Invalid supported Kubernetes list for Contour {app_version}")
        kube_versions = sorted(set(kube_versions), key=lambda value: tuple(map(int, value.split("."))), reverse=True)
        rows.append(OrderedDict([
            ("version", str(app_version)),
            ("kube", kube_versions),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    return rows


def release_images(content, version):
    """Verify the immutable release artifact and read only actual pod images."""
    images = set()
    for document in yaml.safe_load_all(content):
        if not isinstance(document, dict) or document.get("kind") not in {"Deployment", "DaemonSet", "Job"}:
            continue
        pod = document.get("spec", {}).get("template", {}).get("spec", {})
        for container in pod.get("containers", []) + pod.get("initContainers", []):
            image = container.get("image")
            if isinstance(image, str) and image:
                images.add(image)
    if f"ghcr.io/projectcontour/contour:v{version}" not in images:
        raise ValueError(f"Release manifest does not contain Contour v{version}")
    return sorted(images)


def scrape():
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    sections = parse_page(page_content)
    target_tables = find_target_tables(sections)
    if not target_tables:
        print_error("No compatibility information found.")
        return
    try:
        rows = extract_table_data(target_tables)
        existing = read_yaml(target_file)
        if not existing or not existing.get("versions"):
            raise ValueError("Could not read existing Contour compatibility versions")
        recorded = {row["version"] for row in existing["versions"]}
        rows = [row for row in rows if validate_semver(row["version"]) > legacy_version_cutoff and row["version"] not in recorded]
        retained = {row["version"] for row in reduce_versions(deepcopy(existing["versions"]) + rows)}
        rows = [row for row in rows if row["version"] in retained]
        if not rows:
            return
        # Chart packaging is optional: the upstream support matrix remains valid
        # when a third-party chart catalog has no matching application release.
        charts = get_chart_versions(app_name)
        for row in rows:
            version = row["version"]
            content = fetch_page(release_manifest_url.format(version=version))
            if not content:
                raise ValueError(f"Could not fetch the Contour v{version} release manifest")
            row["images"] = release_images(content, version)
            chart = charts.get(version)
            if chart and validate_semver(chart):
                row["chart_version"] = chart
    except (ValueError, yaml.YAMLError) as error:
        print_error(str(error))
        return
    update_compatibility_info(target_file, rows)
