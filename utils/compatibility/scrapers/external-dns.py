"""Join released ExternalDNS versions with their immutable Kubernetes matrix."""

from copy import deepcopy
import hashlib
import json
import re

import requests
import yaml

from utils import (current_kube_version, get_chart_versions, print_error,
                   print_warning, read_yaml, reduce_versions, update_compatibility_info)

app_name = "external-dns"
target_file = "../../static/compatibilities/external-dns.yaml"
releases_url = "https://api.github.com/repos/kubernetes-sigs/external-dns/releases?per_page=100"
matrix_url = "https://raw.githubusercontent.com/kubernetes-sigs/external-dns/v{version}/README.md"
registry_url = "https://registry.k8s.io/v2/external-dns/external-dns"
image_name = "registry.k8s.io/external-dns/external-dns"
legacy_cutoff = (0, 21, 0)
manifest_accept = ", ".join([
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
])

# Documented migration constraints, not generated release summaries.
migration_022 = {
    "helm_changes": "Application support is verified independently of Helm chart availability.",
    "chart_updates": [], "features": [],
    "breaking_changes": [
        "The default annotation prefix is now external-dns.kubernetes.io/ with no fallback. Migrate annotations or explicitly retain --annotation-prefix=external-dns.alpha.kubernetes.io/; incorrect migration can delete DNS records.",
        "--policy is required and has no default. Choose it explicitly before upgrading.",
        "In-tree Plural, Akamai and Transip providers were removed. Use a supported webhook provider or retain a compatible prior ExternalDNS version.",
        "Upstream warns that --dry-run does not prevent changes with ns1, hetzner and alibaba cloud providers; do not rely on it as a universal safety guarantee.",
    ],
}


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d+\.\d+\.\d+", value):
        return None
    return tuple(map(int, value.split(".")))


def recorded_ceiling(row):
    kube = row.get("kube", [])
    if not isinstance(kube, list) or any(not isinstance(value, str) or not re.fullmatch(r"1\.\d+", value) for value in kube):
        raise ValueError("Invalid recorded Kubernetes versions")
    return max(kube, key=lambda value: int(value.split(".")[1]), default=None)


def _get(url, headers=None):
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response


def released_versions(content):
    releases = json.loads(content)
    if not isinstance(releases, list):
        raise ValueError("Expected a GitHub release list")
    versions = set()
    for release in releases:
        if not isinstance(release, dict):
            raise ValueError("Malformed release entry")
        if release.get("draft") is not False or release.get("prerelease") is not False:
            continue
        tag = release.get("tag_name", "")
        version = stable_version(tag[1:]) if isinstance(tag, str) and tag.startswith("v") else None
        if version and version > legacy_cutoff:
            versions.add(version)
    return [".".join(map(str, version)) for version in sorted(versions, reverse=True)]


def _constraint(text, allow_x=False):
    """Parse only the table's explicit exact, union, and bounded range notation."""
    parts = text.replace("≥", ">=").replace("≤", "<=").split(" and ")
    atoms = []
    suffix = r"(?:\.x)?" if allow_x else ""
    for part in parts:
        match = re.fullmatch(r"\s*(>=|<=)?\s*(\d+)\.(\d+)" + suffix + r"\s*", part)
        if not match:
            raise ValueError(f"Unrecognized compatibility constraint: {text!r}")
        atoms.append((match[1], (int(match[2]), int(match[3]))))
    if all(operator is None for operator, _ in atoms):
        values = {value for _, value in atoms}
        return lambda version: version in values
    if any(operator is None for operator, _ in atoms):
        raise ValueError(f"Mixed range and exact values: {text!r}")
    lower = max((value for operator, value in atoms if operator == ">="), default=(0, 0))
    upper = min((value for operator, value in atoms if operator == "<="), default=(999, 999))
    if lower > upper:
        raise ValueError(f"Reversed compatibility range: {text!r}")
    return lambda version: lower <= version <= upper


def supported_kubernetes(content, version, ceiling):
    app_version = stable_version(version)
    cap = re.fullmatch(r"1\.(\d+)", ceiling or "")
    if not app_version or not cap:
        raise ValueError("Invalid application version or cached Kubernetes 1.x ceiling")
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    section = re.split(r"(?m)^## Kubernetes version compatibility\s*$", text)
    if len(section) != 2:
        raise ValueError("Missing or ambiguous Kubernetes compatibility section")
    section = re.split(r"(?m)^## ", section[1], maxsplit=1)[0]
    table = [[cell.strip() for cell in line.strip().strip("|").split("|")]
             for line in section.splitlines() if line.strip().startswith("|")]
    if len(table) < 3 or table[0][0] != "ExternalDNS":
        raise ValueError("Missing ExternalDNS compatibility matrix")
    if any(not re.fullmatch(r":?-+:?", cell) for cell in table[1]):
        raise ValueError("Malformed compatibility table separator")
    selected = [i for i, header in enumerate(table[0][1:], 1)
                if _constraint(header, allow_x=True)(app_version[:2])]
    if len(selected) != 1:
        raise ValueError("Application does not match exactly one compatibility column")
    support = {}
    for row in table[2:]:
        if len(row) != len(table[0]) or not row[0].startswith("Kubernetes "):
            raise ValueError("Malformed Kubernetes compatibility row")
        if any(cell not in {":white_check_mark:", ":x:"} for cell in row[1:]):
            raise ValueError("Unknown compatibility marker")
        matches = _constraint(row[0].removeprefix("Kubernetes "))
        compatible = row[selected[0]] == ":white_check_mark:"
        for minor in range(int(cap[1]) + 1):
            if matches((1, minor)):
                if minor in support and support[minor] != compatible:
                    raise ValueError("Conflicting Kubernetes compatibility rows")
                support[minor] = compatible
    versions = [f"1.{minor}" for minor, compatible in sorted(support.items(), reverse=True) if compatible]
    if not versions:
        raise ValueError("No compatible Kubernetes versions within cached ceiling")
    return versions


def _verified_json(response, digest=None):
    digest = digest or response.headers.get("Docker-Content-Digest", "")
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
        raise ValueError("Registry artifact lacks a SHA256 digest")
    if "sha256:" + hashlib.sha256(response.content).hexdigest() != digest:
        raise ValueError("Registry artifact digest mismatch")
    document = json.loads(response.content)
    if not isinstance(document, dict):
        raise ValueError("Malformed registry artifact")
    return document, digest


def verified_image(version):
    """Read public registry metadata only; never pull or execute image layers."""
    response = _get(f"{registry_url}/manifests/v{version}", {"Accept": manifest_accept})
    document, index_digest = _verified_json(response)
    if document.get("schemaVersion") != 2:
        raise ValueError("Unsupported registry manifest schema")
    if "manifests" in document:
        manifests = document["manifests"]
        if not isinstance(manifests, list):
            raise ValueError("Malformed image index")
        linux = [manifest for manifest in manifests if isinstance(manifest, dict)
                 and isinstance(manifest.get("platform"), dict)
                 and manifest["platform"].get("os") == "linux"
                 and manifest["platform"].get("architecture") == "amd64"]
        if len(linux) != 1:
            raise ValueError("No unique Linux amd64 release manifest")
        digest = linux[0].get("digest")
        if not isinstance(digest, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
            raise ValueError("Malformed platform manifest digest")
        document, _ = _verified_json(_get(f"{registry_url}/manifests/{digest}", {"Accept": manifest_accept}), digest)
    config = document.get("config", {})
    digest = config.get("digest") if isinstance(config, dict) else None
    if not isinstance(digest, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
        raise ValueError("Missing image configuration digest")
    configuration, _ = _verified_json(_get(f"{registry_url}/blobs/{digest}"), digest)
    config = configuration.get("config")
    labels = config.get("Labels", {}) if isinstance(config, dict) else {}
    labels = labels or {}
    if not isinstance(labels, dict):
        raise ValueError("Malformed image configuration labels")
    version_label = labels.get("org.opencontainers.image.version", f"v{version}")
    if not isinstance(version_label, str) or version_label.lstrip("v") != version:
        raise ValueError("Image configuration version does not match release")
    source = labels.get("org.opencontainers.image.source", "https://github.com/kubernetes-sigs/external-dns")
    if not isinstance(source, str) or source.rstrip("/") != "https://github.com/kubernetes-sigs/external-dns":
        raise ValueError("Image configuration points to another project")
    return f"{image_name}:v{version}@{index_digest}"


def scrape():
    existing = read_yaml(target_file)
    if not isinstance(existing, dict) or not isinstance(existing.get("versions"), list):
        print_error("Existing ExternalDNS compatibility data is missing or invalid")
        return
    try:
        recorded = {row["version"]: row for row in existing["versions"]}
        if len(recorded) != len(existing["versions"]):
            raise ValueError("Duplicate existing ExternalDNS versions")
        versions = set(released_versions(_get(releases_url).content))
        # Stored nonlegacy releases may have fallen off the bounded release list.
        # Their immutable matrices still determine whether a new ceiling extends
        # an explicitly open-ended range. Legacy history remains untouched.
        versions.update(version for version in recorded
                        if stable_version(version) and stable_version(version)[:2] >= (0, 22))
        ceiling = current_kube_version()
        charts = get_chart_versions(app_name)
        backfills = []
        for version, original in recorded.items():
            chart = charts.get(version)
            if not original.get("chart_version") and stable_version(chart):
                backfills.append(dict(deepcopy(original), chart_version=chart))
        rows, refreshed = [], []
        for version in sorted(versions, key=stable_version, reverse=True):
            original = recorded.get(version)
            if original and stable_version(version)[:2] < (0, 22):
                continue
            if original and recorded_ceiling(original) == ceiling:
                continue
            kube = supported_kubernetes(_get(matrix_url.format(version=version)).content,
                                        version, ceiling)
            if original:
                if kube != original["kube"]:
                    # Retain a simultaneous exact chart backfill on this version
                    # as well as all saved image, summary and EOL metadata.
                    row = deepcopy(next((row for row in backfills if row["version"] == version), original))
                    row["kube"] = kube
                    refreshed.append(row)
                    backfills = [row for row in backfills if row["version"] != version]
                continue
            row = {"version": version, "kube": kube, "requirements": [], "incompatibilities": []}
            chart = charts.get(version)
            if stable_version(chart):
                row["chart_version"] = chart
            if version == "0.22.0":
                row["summary"] = deepcopy(migration_022)
                if row.get("chart_version"):
                    row["summary"]["helm_changes"] = "Official chart packaging is available; review the application migration constraints below."
            rows.append(row)
        combined = deepcopy(recorded)
        combined.update({row["version"]: row for row in backfills + refreshed + rows})
        retained = {row["version"] for row in reduce_versions(list(combined.values()))}
        rows = [row for row in rows if row["version"] in retained]
        backfills = [row for row in backfills if row["version"] in retained]
        refreshed = [row for row in refreshed if row["version"] in retained]
        for row in rows:
            try:
                row["images"] = [verified_image(row["version"])]
            except (requests.RequestException, ValueError, KeyError, TypeError) as error:
                print_warning(f"Could not verify released image for {row['version']}: {error}")
                row["images"] = []
    except (requests.RequestException, ValueError, KeyError, TypeError, yaml.YAMLError) as error:
        print_error(f"Cannot update ExternalDNS compatibility: {error}")
        return
    if backfills or refreshed or rows:
        update_compatibility_info(target_file, backfills + refreshed + rows)
