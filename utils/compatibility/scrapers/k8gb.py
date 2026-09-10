"""K8GB's published Helm requirements, not a Kubernetes runtime certification."""

from collections import OrderedDict
from copy import deepcopy
import hashlib
import io
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
from urllib.parse import urljoin, urlsplit

import requests
import yaml

APP = "k8gb"
HELM_REPOSITORY = "https://www.k8gb.io"
INDEX_URL = f"{HELM_REPOSITORY}/index.yaml"
TARGET_FILE = "../../static/compatibilities/k8gb.yaml"
_VERSION = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")


def stable_version(value):
    match = _VERSION.fullmatch(value) if isinstance(value, str) else None
    return tuple(map(int, match.groups())) if match else None


def kube_minors(requirement, latest):
    """Expand a declared whole-minor floor only through Plural's KUBE_VERSION."""
    bound = re.fullmatch(r"1\.(0|[1-9]\d*)", latest or "")
    floor = re.fullmatch(r"\s*>=\s*1\.(0|[1-9]\d*)\.0(?:-0)?\s*", requirement or "")
    if not bound or not floor:
        raise ValueError("Unsupported Kubernetes requirement or KUBE_VERSION")
    low, high = int(floor[1]), int(bound[1])
    return [f"1.{minor}" for minor in range(high, low - 1, -1)]


def parse_index(content, latest):
    index = yaml.safe_load(content)
    entries = index.get("entries", {}).get(APP) if isinstance(index, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("K8GB chart index is missing or empty")
    selected, chart_ids = {}, {}
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("name") != APP:
            raise ValueError("Invalid K8GB chart entry")
        app_version = stable_version(entry.get("appVersion"))
        chart_version = stable_version(entry.get("version"))
        # Legacy packages omit requirements; never invent a support range for them.
        if not app_version or not chart_version or entry.get("deprecated"):
            continue
        if not entry.get("kubeVersion"):
            continue
        if not re.fullmatch(r"[0-9a-fA-F]{64}", entry.get("digest", "")):
            raise ValueError("Chart is missing a SHA-256 digest")
        urls = entry.get("urls")
        if not isinstance(urls, list) or not urls or not isinstance(urls[0], str):
            raise ValueError("Chart is missing its download URL")
        url = urljoin(INDEX_URL, urls[0])
        parsed_url = urlsplit(url)
        if (parsed_url.scheme != "https" or parsed_url.hostname not in ("www.k8gb.io", "k8gb.io")
                or parsed_url.username or parsed_url.password or parsed_url.port not in (None, 443)):
            raise ValueError("Chart URL must use the official HTTPS repository")
        kube = kube_minors(entry["kubeVersion"], latest)
        if not kube:
            continue
        identity = (entry["appVersion"], entry["kubeVersion"], entry["digest"].lower(), url)
        if chart_version in chart_ids and chart_ids[chart_version] != identity:
            raise ValueError("Conflicting duplicate chart version")
        chart_ids[chart_version] = identity
        candidate = dict(entry, download_url=url, kube=kube)
        previous = selected.get(app_version)
        if previous is None or chart_version > stable_version(previous["version"]):
            selected[app_version] = candidate
    if not selected:
        raise ValueError("No stable charts with explicit representable requirements")
    return [selected[version] for version in sorted(selected, reverse=True)]


def fetch_bytes(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def verify_chart(content, entry):
    if hashlib.sha256(content).hexdigest() != entry["digest"].lower():
        raise ValueError("Downloaded chart does not match the index digest")
    # Read exactly one regular member, never extract an untrusted archive to disk.
    with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as archive:
        members = [m for m in archive.getmembers() if m.name == "k8gb/Chart.yaml"]
        if len(members) != 1 or not members[0].isfile() or members[0].size > 100_000:
            raise ValueError("Chart.yaml must be a unique small regular file")
        metadata = yaml.safe_load(archive.extractfile(members[0]).read())
    if not isinstance(metadata, dict):
        raise ValueError("Invalid chart metadata")
    for key in ("name", "version", "appVersion", "kubeVersion"):
        if metadata.get(key) != entry[key]:
            raise ValueError(f"Published chart disagrees with index: {key}")


def chart_images(content, latest):
    from utils import find_nested_images

    with tempfile.TemporaryDirectory(prefix="k8gb-chart-") as directory:
        chart = Path(directory) / "k8gb.tgz"
        chart.write_bytes(content)
        result = subprocess.run(
            ["helm", "template", APP, str(chart), "--kube-version", latest],
            capture_output=True, text=True, timeout=60, check=True,
        )
    images = find_nested_images(list(yaml.safe_load_all(result.stdout)))
    if not images:
        raise ValueError("Published chart rendered no container images")
    return images


def scrape():
    from utils import current_kube_version, read_yaml, reduce_versions, update_versions_data, write_yaml

    existing = read_yaml(TARGET_FILE)
    if not isinstance(existing, dict) or not isinstance(existing.get("versions"), list):
        raise ValueError("Existing K8GB metadata is missing or invalid")
    latest = current_kube_version()
    entries = parse_index(fetch_bytes(INDEX_URL), latest)
    rows, by_version = [], {}
    for entry in entries:
        version = ".".join(map(str, stable_version(entry["appVersion"])))
        by_version[(version, entry["version"])] = entry
        rows.append(OrderedDict([
            ("version", version), ("kube", entry["kube"]),
            ("chart_version", entry["version"]),
            ("requirements", []), ("incompatibilities", []),
        ]))
    candidate = deepcopy(existing)
    update_versions_data(candidate, rows)
    candidate["versions"] = reduce_versions(candidate["versions"])
    for row in candidate["versions"]:
        entry = by_version.get((row["version"], row["chart_version"]))
        if entry is None:
            raise ValueError("An existing catalog version cannot be verified against the index")
        content = fetch_bytes(entry["download_url"])
        verify_chart(content, entry)
        row["images"] = chart_images(content, latest)
    # All charts must succeed before the only write. No summarization/paid API.
    if candidate != existing and not write_yaml(TARGET_FILE, candidate):
        raise OSError("Cannot write K8GB compatibility data")
    return candidate


if __name__ == "__main__":
    scrape()
