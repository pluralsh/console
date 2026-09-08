"""Portainer CE's explicitly tested Kubernetes versions (not inferred ranges)."""

import io
import re
import tarfile
import warnings
from urllib.parse import urljoin

import yaml
from packaging.version import Version, InvalidVersion

app_name = "portainer"
SOURCE_URL = "https://docs.portainer.io/start/requirements-and-prerequisites.md"
CHART_URL = "https://portainer.github.io/k8s/"


def parse_compatibility(markdown):
    section = re.search(
        r"^### Portainer Community Edition \(CE\)\s*$(.*?)(?=^#{1,3} |\Z)",
        markdown, re.MULTILINE | re.DOTALL,
    )
    if not section:
        raise ValueError("Portainer CE compatibility section missing")
    versions = {}
    columns = None
    for line in section.group(1).splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if "Portainer Version" in cells and "Kubernetes Version" in cells:
            columns = (cells.index("Portainer Version"), cells.index("Kubernetes Version"))
            continue
        if columns is None or len(cells) <= max(columns):
            continue
        release = re.fullmatch(r"Community (\d+\.\d+\.\d+)(?: (?:LTS|STS))?", cells[columns[0]])
        if not release:
            continue
        kube_cell = re.sub(r"<br\s*/?>", " ", cells[columns[1]], flags=re.IGNORECASE)
        if not re.fullmatch(r"\s*1\.\d+(?:\s+1\.\d+)*\s*", kube_cell):
            warnings.warn(f"Skipping {release.group(1)}: unexpected Kubernetes versions {kube_cell!r}")
            continue
        kube = sorted(set(kube_cell.split()), key=Version)
        version = release.group(1)
        if version in versions and versions[version] != kube:
            raise ValueError(f"Conflicting compatibility rows for {version}")
        versions[version] = kube
    if not versions:
        raise ValueError("No Portainer CE compatibility rows found")
    return versions


def chart_ce_version(archive):
    # Inspect the package without extracting files or executing Helm templates.
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as chart:
        stream = chart.extractfile("portainer/values.yaml")
        if stream is None:
            raise ValueError("Portainer chart values missing")
        values = yaml.safe_load(stream)
    if values.get("enterpriseEdition", {}).get("enabled", False):
        return None
    image = values.get("image", {})
    if image.get("repository") != "portainer/portainer-ce":
        return None
    tag = str(image.get("tag", ""))
    return tag if re.fullmatch(r"\d+\.\d+\.\d+", tag) else None


def build_versions(markdown, chart_index, fetch):
    compatibility = parse_compatibility(markdown)
    charts = {}
    entries = []
    for entry in chart_index["entries"]["portainer"]:
        try:
            version = Version(str(entry["version"]))
        except InvalidVersion:
            continue
        if not version.is_prerelease:
            entries.append((version, entry))
    for _, entry in sorted(entries, key=lambda item: item[0], reverse=True):
        # appVersion may be floating, absent, or describe only Business Edition.
        # Only the packaged CE default can establish the mapping.
        if compatibility.keys() <= charts.keys():
            break
        archive = fetch(urljoin(CHART_URL, entry["urls"][0]))
        if archive is None:
            raise ValueError("Could not fetch Portainer chart")
        ce_version = chart_ce_version(archive)
        if ce_version in compatibility and ce_version not in charts:
            charts[ce_version] = str(entry["version"])
    versions = []
    for version in sorted(compatibility, key=Version, reverse=True):
        item = {"version": version, "kube": compatibility[version],
                "requirements": [], "incompatibilities": []}
        if version in charts:
            item["chart_version"] = charts[version]
        versions.append(item)
    return versions


def scrape():
    from utils import fetch_page, update_compatibility_info

    source = fetch_page(SOURCE_URL)
    index = fetch_page(urljoin(CHART_URL, "index.yaml"))
    if source is None or index is None:
        raise ValueError("Could not fetch Portainer compatibility sources")
    versions = build_versions(source.decode("utf-8"), yaml.safe_load(index), fetch_page)
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
