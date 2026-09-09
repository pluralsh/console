"""K8up support requirements from released charts and matching operator tags."""

import hashlib
import io
import re
import tarfile

import requests
import yaml
from packaging.version import Version

app_name = "k8up"
HELM_REPOSITORY = "https://k8up-io.github.io/k8up"
REPOSITORY = "https://github.com/k8up-io/k8up"
RAW_REPOSITORY = "https://raw.githubusercontent.com/k8up-io/k8up"
# 4.9.0 installs 2.15.0, the first release with an explicit supported
# Kubernetes minimum. Earlier docs only say "recent stable" versions.
MIN_CHART = Version("4.9.0")
REQUIREMENTS_PATH = "docs/modules/ROOT/pages/explanations/system-requirements.adoc"


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        raise ValueError(f"Expected a stable release version, got {value!r}")
    return Version(value.lstrip("v"))


def chart_entries(payload):
    index = yaml.safe_load(payload)
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise ValueError("Invalid K8up Helm index")
    entries = index["entries"].get(app_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError("No K8up charts in Helm index")
    selected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid K8up chart entry")
        raw = entry.get("version")
        # Do not treat release candidates or development builds as releases.
        if not isinstance(raw, str) or not re.fullmatch(r"\d+\.\d+\.\d+", raw):
            continue
        version = stable_version(raw)
        if version < MIN_CHART:
            continue
        url = f"{REPOSITORY}/releases/download/k8up-{raw}/k8up-{raw}.tgz"
        digest = entry.get("digest", "")
        if url not in entry.get("urls", []) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"Missing release archive or digest for chart {raw}")
        if version in selected and selected[version] != (url, digest):
            raise ValueError(f"Conflicting metadata for chart {raw}")
        selected[version] = (url, digest)
    if not selected:
        raise ValueError("No K8up charts with documented support")
    return [(str(v), *selected[v]) for v in sorted(selected, reverse=True)]


def operator_version(archive, chart_version, digest):
    """Read exact packaged defaults; the Helm index has no appVersion."""
    if hashlib.sha256(archive).hexdigest() != digest:
        raise ValueError(f"Digest mismatch for K8up chart {chart_version}")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as chart:
        documents = {}
        for name in ("Chart.yaml", "values.yaml"):
            member = chart.getmember(f"k8up/{name}")
            if not member.isfile() or member.size > 1024 * 1024:
                raise ValueError(f"Invalid K8up chart member: {name}")
            documents[name] = yaml.safe_load(chart.extractfile(member).read())
    metadata, values = documents["Chart.yaml"], documents["values.yaml"]
    if (
        not isinstance(metadata, dict)
        or metadata.get("name") != app_name
        or metadata.get("version") != chart_version
    ):
        raise ValueError("Packaged chart metadata does not match the index")
    if not isinstance(values, dict) or not isinstance(values.get("image"), dict):
        raise ValueError("K8up operator image defaults are missing")
    image = values["image"]
    if image.get("registry") != "ghcr.io" or image.get("repository") != "k8up-io/k8up":
        raise ValueError("Unexpected K8up operator image repository")
    return str(stable_version(image.get("tag")))


def supported_kubernetes(document, current):
    text = document.decode("utf-8") if isinstance(document, bytes) else document
    # Match the supported v2+ statement, never the legacy v1/OpenShift example
    # or the unsupported SPDY fallback. A changed statement needs review.
    matches = re.findall(
        r"K8up \(v2 or later\) officially only supports recent stable Kubernetes "
        r"versions with support for WebSocket connections in the API server "
        r"\(`(1\.\d+)` or later\)\.",
        " ".join(text.split()),
    )
    if len(matches) != 1:
        raise ValueError("Explicit K8up supported Kubernetes minimum not found")
    if not isinstance(current, str) or not re.fullmatch(r"1\.\d+", current):
        raise ValueError("Invalid Plural Kubernetes ceiling")
    first, last = int(matches[0].split(".")[1]), int(current.split(".")[1])
    if first > last:
        raise ValueError("K8up minimum is newer than Plural's Kubernetes ceiling")
    return [f"1.{minor}" for minor in range(last, first - 1, -1)]


def fetch_source(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def build_rows(index, current, fetcher):
    rows = {}
    for chart_version, url, digest in chart_entries(index):
        version = operator_version(fetcher(url), chart_version, digest)
        if version in rows:
            # Prefer the newest chart when several charts install one version.
            continue
        source = f"{RAW_REPOSITORY}/v{version}/{REQUIREMENTS_PATH}"
        rows[version] = {
            "version": version,
            "kube": supported_kubernetes(fetcher(source), current),
            "chart_version": chart_version,
            "requirements": [],
            "incompatibilities": [],
        }
    return [rows[v] for v in sorted(rows, key=Version, reverse=True)]


def scrape():
    from utils import current_kube_version, update_compatibility_info

    # Finish every retrieval and validation before the shared writer runs.
    rows = build_rows(
        fetch_source(f"{HELM_REPOSITORY}/index.yaml"),
        current_kube_version(),
        fetch_source,
    )
    update_compatibility_info("../../static/compatibilities/k8up.yaml", rows)
