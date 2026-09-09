import re
import yaml
import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    expand_kube_versions,
    current_kube_version,
    validate_semver,
)

APP_NAME = "longhorn"
INDEX_URL = "https://charts.longhorn.io/index.yaml"
TESTED_VERSIONS_URL = "https://longhorn.io/docs/{version}/best-practices/"


def parse_tested_kube_versions(content, version):
    """Read only the release-specific, explicitly tested Kubernetes table."""
    soup = BeautifulSoup(content, "html.parser")
    heading = soup.find("h3", id="kubernetes-version")
    if heading is None:
        raise ValueError(f"Longhorn {version}: Kubernetes Version section not found")

    section = []
    for sibling in heading.next_siblings:
        if getattr(sibling, "name", None) in ("h1", "h2", "h3"):
            break
        section.append(str(sibling))
    section = BeautifulSoup("".join(section), "html.parser")
    declaration = rf"tested with Longhorn v{re.escape(version)}\b"
    if not re.search(declaration, section.get_text(" ", strip=True)):
        raise ValueError(f"Longhorn {version}: release-specific testing statement missing")

    table = section.find("table")
    if table is None or [cell.get_text(strip=True) for cell in table.find_all("th")] != [
        "Release", "Released", "End-of-life"
    ]:
        raise ValueError(f"Longhorn {version}: tested Kubernetes table not found")

    versions = set()
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        kube_version = cells[0].get_text(strip=True)
        if len(cells) != 3 or not re.fullmatch(r"\d+\.\d+", kube_version):
            raise ValueError(f"Longhorn {version}: invalid tested version {kube_version!r}")
        versions.add(kube_version)
    if not versions:
        raise ValueError(f"Longhorn {version}: tested Kubernetes table is empty")
    return sorted(versions, key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def fetch_tested_kube_versions(version):
    url = TESTED_VERSIONS_URL.format(version=version)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    if response.url.rstrip("/") != url.rstrip("/"):
        raise ValueError(f"Longhorn {version}: documentation redirected to {response.url}")
    return parse_tested_kube_versions(response.text, version)


def parse_kube_range(spec, latest_kube):
    """
    Parse a Helm kubeVersion constraint like:
      '>=1.25.0-0'
      '>=1.18.0-0 <1.25.0-0'
      '>= v1.16.0-0, < v1.22.0-0'

    and return a (min, max) inclusive pair of Kubernetes minor versions,
    e.g. ('1.25', '1.34').
    """
    if not spec:
        return None

    # Normalise whitespace and separators
    spec = spec.replace(",", " ")

    pattern = r"(>=|<=|<|>|=)?\s*v?(\d+)\.(\d+)"
    matches = re.findall(pattern, spec)

    if not matches:
        return None

    min_major = None
    min_minor = None
    max_major = None
    max_minor = None

    for op, maj_str, min_str in matches:
        major = int(maj_str)
        minor = int(min_str)

        # Treat missing operator as a lower bound
        if not op or op in (">", ">="):
            if min_major is None or (major, minor) > (min_major, min_minor):
                min_major, min_minor = major, minor
        elif op in ("<", "<="):
            # For '< 1.25', cap at 1.24
            if op == "<":
                minor -= 1
                if minor < 0:
                    continue
            if max_major is None or (major, minor) < (max_major, max_minor):
                max_major, max_minor = major, minor

    if min_major is None:
        return None

    if max_major is None:
        # No explicit upper bound: assume up to the latest known Kubernetes minor
        latest_major, latest_minor = latest_kube.split(".")
        max_major = int(latest_major)
        max_minor = int(latest_minor)

    return f"{min_major}.{min_minor}", f"{max_major}.{max_minor}"


def extract_versions(index_yaml, latest_kube):
    entries = index_yaml.get("entries", {})
    longhorn_entries = entries.get("longhorn", [])
    versions = []
    selected = {}

    for entry in longhorn_entries:
        app_version_raw = entry.get("appVersion", "").lstrip("v")
        app_version = validate_semver(app_version_raw)
        chart_version = validate_semver(entry.get("version", "").lstrip("v"))
        if not app_version or not chart_version:
            continue
        previous = selected.get(app_version)
        if previous is None or chart_version > previous[0]:
            selected[app_version] = (chart_version, entry)

    for app_version in sorted(selected, reverse=True):
        chart_version, entry = selected[app_version]
        if app_version >= validate_semver("1.11.0"):
            # Helm's lower install bound does not identify tested combinations.
            # Use each exact release's table, without expanding to today's K8s.
            kube_versions = fetch_tested_kube_versions(str(app_version))
        else:
            # Retain historical behavior for releases outside the verified docs.
            bounds = parse_kube_range(entry.get("kubeVersion"), latest_kube)
            if not bounds:
                continue
            kube_versions = expand_kube_versions(*bounds)

        version_info = OrderedDict(
            [
                ("version", str(app_version)),
                ("kube", kube_versions),
                ("chart_version", str(chart_version)),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
        versions.append(version_info)

    return versions


def scrape():
    latest_kube = current_kube_version()
    if not latest_kube:
        print_error("Could not determine current Kubernetes version from KUBE_VERSION.")
        return

    content = fetch_page(INDEX_URL)
    if not content:
        return

    try:
        index_yaml = yaml.safe_load(content)
    except Exception as e:
        print_error(f"Failed to parse Longhorn index.yaml: {e}")
        return

    rows = extract_versions(index_yaml, latest_kube)
    if not rows:
        print_error("No Longhorn versions extracted from index.yaml.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{APP_NAME}.yaml", rows
    )
