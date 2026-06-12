from collections import OrderedDict
import re

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
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _clean_cell(cell):
    return re.sub(r"\s+", " ", cell.strip().strip("`").replace("*", ""))


def _parse_kube_versions(value):
    cleaned = _clean_cell(value).lstrip("v")
    if cleaned.endswith("+"):
        return expand_kube_versions(cleaned[:-1], current_kube_version())
    if "-" in cleaned:
        start, end = [part.strip().lstrip("v") for part in cleaned.split("-", 1)]
        return expand_kube_versions(start, end)
    return [cleaned]


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
        rows.append(
            OrderedDict(
                [
                    ("version", ver),
                    ("kube", _parse_kube_versions(columns[2])),
                    ("chart_version", ver),
                    (
                        "images",
                        [
                            f"ghcr.io/nginx/nginx-gateway-fabric:{ver}",
                            f"ghcr.io/nginx/nginx-gateway-fabric/nginx:{ver}",
                        ],
                    ),
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
