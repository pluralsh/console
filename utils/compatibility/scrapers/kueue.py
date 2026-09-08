import re

import requests

from utils import update_compatibility_info


CHART_TAGS_URL = "https://registry.k8s.io/v2/kueue/charts/kueue/tags/list"
README_URL = "https://raw.githubusercontent.com/kubernetes-sigs/kueue/v{version}/README.md"
COMPATIBILITY_FILE = "../../static/compatibilities/kueue.yaml"
REQUEST_TIMEOUT = 30


def stable_chart_versions(payload):
    """OCI registries also list signature/attestation tags; accept releases only."""
    tags = payload.get("tags") if isinstance(payload, dict) else None
    if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
        raise ValueError("Kueue registry response must contain a list of tag strings")

    number = r"(?:0|[1-9][0-9]*)"
    versions = {tag for tag in tags if re.fullmatch(rf"{number}\.{number}\.{number}", tag)}
    if not versions:
        raise ValueError("No stable Kueue Helm chart versions found")
    return sorted(versions, key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def tested_kube_versions(markdown):
    """Use explicit E2E versions, not an unbounded installation minimum."""
    section = re.search(
        r"^## Production Readiness status\s*\n(.*?)(?=^## |\Z)",
        markdown,
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    if not section:
        raise ValueError("Kueue README has no production readiness section")

    links = re.findall(
        r"\[([0-9]+\.[0-9]+)\]\("
        r"(https://testgrid\.k8s\.io/sig-scheduling#periodic-kueue-test-e2e-[^)]+)\)",
        section.group(1),
    )
    versions = set()
    for label, url in links:
        target = re.search(r"-main-([0-9]+)-([0-9]+)$", url)
        if not target or label != f"{target.group(1)}.{target.group(2)}":
            raise ValueError(f"Kueue E2E link does not match Kubernetes {label}: {url}")
        versions.add(label)

    if not versions:
        raise ValueError("No explicit Kubernetes E2E versions found in Kueue README")
    return sorted(versions, key=lambda value: tuple(map(int, value.split("."))), reverse=True)


def scrape():
    response = requests.get(CHART_TAGS_URL, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    versions = stable_chart_versions(response.json())

    rows = []
    for version in versions:
        # Chart version and appVersion are set from the same release tag upstream.
        # Pin the documentation to that tag so main cannot rewrite historical data.
        url = README_URL.format(version=version)
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        try:
            kube_versions = tested_kube_versions(response.text)
        except ValueError as error:
            raise ValueError(f"Invalid Kueue compatibility source {url}: {error}") from error
        rows.append({"version": version, "kube": kube_versions, "chart_version": version})

    # Fetch and validate every source before allowing the shared writer to change data.
    update_compatibility_info(COMPATIBILITY_FILE, rows)
