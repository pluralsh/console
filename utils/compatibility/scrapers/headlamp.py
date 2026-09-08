"""Read Headlamp compatibility from checksum-verified, release-packaged docs."""
from __future__ import annotations

import hashlib
import io
import re
import tarfile
from urllib.parse import urlparse

import yaml
from packaging.version import InvalidVersion, Version

app_name = "headlamp"
helm_index_url = "https://kubernetes-sigs.github.io/headlamp/index.yaml"
# Earlier published charts have no Kubernetes prerequisite in their README.
MIN_DOCUMENTED_CHART = Version("0.28.0")


def stable_charts(index_payload: bytes | str) -> list[dict]:
    index = yaml.safe_load(index_payload)
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise ValueError("Malformed Headlamp Helm index")
    entries = index["entries"].get(app_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError("Headlamp chart entries not found")
    selected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed Headlamp chart entry")
        try:
            chart = Version(str(entry.get("version", "")))
            app = Version(str(entry.get("appVersion", "")))
        except InvalidVersion:
            continue
        if any(v.is_prerelease or v.is_devrelease or v.local for v in (chart, app)):
            continue
        if chart < MIN_DOCUMENTED_CHART:
            continue
        key = (app.major, app.minor)
        # Application version is the row identity; chart version is independent.
        rank = (app, chart)
        previous = selected.get(key)
        if previous is None or rank > previous[0]:
            selected[key] = (rank, entry)
        elif rank == previous[0] and entry != previous[1]:
            raise ValueError("Conflicting duplicate Headlamp chart entry")
    if not selected:
        raise ValueError("No documented stable Headlamp charts found")
    return [selected[key][1] for key in sorted(selected, reverse=True)]


def parse_minimum(readme: str) -> str:
    # Do not mistake optional feature requirements (e.g. PDB >=1.27) for
    # the application's Kubernetes minimum.
    section = re.search(r"(?mi)^## Prerequisites\s*\n(.*?)(?=^## |\Z)", readme, re.S)
    if not section:
        raise ValueError("Headlamp Prerequisites section not found")
    matches = re.findall(r"(?m)^- Kubernetes (1\.\d+)\+\s*$", section.group(1))
    if len(matches) != 1:
        raise ValueError("Expected one explicit Headlamp Kubernetes minimum")
    return matches[0]


def expand_minimum(minimum: str, current: str) -> list[str]:
    versions = []
    for value in (minimum, current):
        match = re.fullmatch(r"1\.(\d+)", value)
        if not match:
            raise ValueError(f"Unsupported Kubernetes minor: {value!r}")
        versions.append(int(match.group(1)))
    start, end = versions
    if start > end:
        raise ValueError("Headlamp Kubernetes minimum is newer than Plural")
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def archive_url(entry: dict) -> str:
    urls = entry.get("urls")
    if not isinstance(urls, list) or not urls or not isinstance(urls[0], str):
        raise ValueError("Headlamp chart URL missing")
    parsed = urlparse(urls[0])
    if (parsed.scheme != "https" or parsed.netloc != "github.com"
            or not parsed.path.startswith(("/kubernetes-sigs/headlamp/releases/download/",
                                           "/headlamp-k8s/headlamp/releases/download/",
                                           "/kinvolk/headlamp/releases/download/"))):
        raise ValueError("Headlamp chart URL is not an official release archive")
    return urls[0]


def packaged_minimum(entry: dict, payload: bytes) -> str:
    digest = entry.get("digest", "")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("Headlamp chart SHA256 missing or malformed")
    if hashlib.sha256(payload).hexdigest() != digest:
        raise ValueError("Headlamp chart SHA256 mismatch")
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        def read(name):
            matches = [member for member in archive.getmembers() if member.name == name]
            if len(matches) != 1 or not matches[0].isfile() or matches[0].size > 2_000_000:
                raise ValueError(f"Invalid or missing chart member: {name}")
            # Read the two expected files in memory; never extract archive paths.
            return archive.extractfile(matches[0]).read().decode("utf-8")
        chart = yaml.safe_load(read("headlamp/Chart.yaml"))
        if not isinstance(chart, dict) or chart.get("name") != app_name:
            raise ValueError("Unexpected packaged chart")
        for key in ("version", "appVersion"):
            if str(chart.get(key)) != str(entry.get(key)):
                raise ValueError(f"Packaged Headlamp {key} differs from index")
        return parse_minimum(read("headlamp/README.md"))


def build_rows(index_payload: bytes | str, current_kube: str, fetcher) -> list[dict]:
    rows = []
    for entry in stable_charts(index_payload):
        url = archive_url(entry)
        payload = fetcher(url)
        if not isinstance(payload, bytes) or not payload:
            raise ValueError(f"Could not fetch Headlamp chart {entry['version']}")
        minimum = packaged_minimum(entry, payload)
        rows.append({
            "version": str(entry["appVersion"]),
            "kube": expand_minimum(minimum, current_kube),
            "chart_version": str(entry["version"]),
            "requirements": [],
            "incompatibilities": [],
        })
    return rows


def scrape() -> None:
    from utils import current_kube_version, fetch_page, update_compatibility_info
    index = fetch_page(helm_index_url)
    if not index:
        raise ValueError("Could not fetch Headlamp Helm index")
    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version unavailable")
    rows = build_rows(index, current, fetch_page)
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
