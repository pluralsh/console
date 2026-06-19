import json
import re
from collections import OrderedDict

from packaging.version import Version

from utils import fetch_page, print_error, print_warning, update_compatibility_info


APP_NAME = "envoy-gateway"
COMPATIBILITY_URL = "https://raw.githubusercontent.com/envoyproxy/gateway/main/site/content/en/news/releases/matrix.md"
TAGS_URL = "https://api.github.com/repos/envoyproxy/gateway/tags"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(value):
    return value.strip().strip("*").strip()


def _version_series(value):
    match = re.search(r"v?(\d+\.\d+)", value)
    if not match:
        return None
    return match.group(1)


def _kube_versions(value):
    return [match.group(1) for match in re.finditer(r"v?(\d+\.\d+)", value)]


def _latest_patch_versions():
    latest = {}
    page = 1

    while True:
        content = fetch_page(f"{TAGS_URL}?per_page=100&page={page}")
        if not content:
            return latest

        try:
            tags = json.loads(_decode(content))
        except json.JSONDecodeError as exc:
            print_error(f"Failed to parse Envoy Gateway tags: {exc}")
            return latest

        if not tags:
            break

        for tag in tags:
            tag_name = str(tag.get("name", ""))
            match = re.fullmatch(r"v(\d+\.\d+\.\d+)", tag_name)
            if not match:
                continue

            app_version = match.group(1)
            parsed = Version(app_version)
            series = f"{parsed.major}.{parsed.minor}"
            current = latest.get(series)
            if not current or parsed > Version(current):
                latest[series] = app_version

        if len(tags) < 100:
            break

        page += 1

    return latest


def _matrix_rows(content):
    rows = {}
    version_idx = None
    kube_idx = None

    for line in _decode(content).splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        if set(stripped.replace("|", "").strip()) <= {"-"}:
            continue

        columns = [_clean_cell(column) for column in stripped.strip("|").split("|")]
        if "Envoy Gateway version" in columns and "Kubernetes version" in columns:
            version_idx = columns.index("Envoy Gateway version")
            kube_idx = columns.index("Kubernetes version")
            continue

        if version_idx is None or kube_idx is None:
            continue
        if len(columns) <= max(version_idx, kube_idx):
            continue

        if columns[version_idx] == "latest":
            continue

        series = _version_series(columns[version_idx])
        kube_versions = _kube_versions(columns[kube_idx])
        if series and kube_versions:
            rows[series] = kube_versions

    return rows


def scrape():
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        print_error("Failed to fetch Envoy Gateway compatibility matrix.")
        return

    compatibility = _matrix_rows(content)
    if not compatibility:
        print_error("No Envoy Gateway compatibility rows found.")
        return

    latest_versions = _latest_patch_versions()
    if not latest_versions:
        print_error("No Envoy Gateway release tags found.")
        return

    versions = []
    skipped_series = []
    for series, kube_versions in compatibility.items():
        app_version = latest_versions.get(series)
        if not app_version:
            skipped_series.append(series)
            continue

        versions.append(
            OrderedDict(
                [
                    ("version", app_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if skipped_series:
        print_warning(
            "Skipped Envoy Gateway series without stable release tags: "
            + ", ".join(skipped_series)
        )

    if not versions:
        print_error("No Envoy Gateway versions extracted from compatibility matrix.")
        return

    update_compatibility_info(TARGET_FILE, versions)
