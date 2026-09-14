"""Read the Kubernetes e2e matrix from each stable Argo Rollouts release tag."""

import re
from collections import OrderedDict

import requests
import yaml

from utils import get_chart_versions, print_success, update_compatibility_info

app_name = "argo-rollouts"
github_api_tags_url = "https://api.github.com/repos/argoproj/argo-rollouts/tags"
workflow_url = (
    "https://raw.githubusercontent.com/argoproj/argo-rollouts/"
    "refs/tags/{tag}/.github/workflows/testing.yaml"
)
stable_version = re.compile(r"\d+\.\d+\.\d+")


def fetch_github_tags():
    tags = []
    page = 1
    while True:
        response = requests.get(
            github_api_tags_url, params={"per_page": 100, "page": page}, timeout=30
        )
        response.raise_for_status()
        entries = response.json()
        if not isinstance(entries, list) or any(
            not isinstance(entry, dict) or not isinstance(entry.get("name"), str)
            for entry in entries
        ):
            raise ValueError("Invalid Argo Rollouts tags response")
        names = [entry["name"] for entry in entries]
        if names and all(name in tags for name in names):
            raise ValueError("Argo Rollouts tags pagination did not advance")
        tags.extend(name for name in names if name not in tags)
        if len(entries) < 100:
            return tags
        page += 1


def parse_kube_versions(content):
    matrix = yaml.safe_load(content)
    for key in ("jobs", "test-e2e", "strategy", "matrix", "kubernetes"):
        if not isinstance(matrix, dict) or key not in matrix:
            raise ValueError("Argo Rollouts e2e Kubernetes matrix not found")
        matrix = matrix[key]
    if not isinstance(matrix, list) or not matrix:
        raise ValueError("Argo Rollouts e2e Kubernetes matrix is empty or invalid")

    versions = set()
    for entry in matrix:
        version = entry.get("version") if isinstance(entry, dict) else None
        # Quoted minor versions are required: YAML turns unquoted 1.30 into 1.3.
        if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+", version):
            raise ValueError(f"Invalid Kubernetes matrix entry: {entry!r}")
        versions.add(version)
    return sorted(
        versions, key=lambda version: tuple(map(int, version.split("."))), reverse=True
    )


def scrape():
    release_tags = fetch_github_tags()
    if not release_tags:
        raise ValueError("No Argo Rollouts release tags found")

    chart_versions = get_chart_versions(app_name)
    rows = []
    for tag in release_tags:
        tag_version = tag.removeprefix("v")
        if not stable_version.fullmatch(tag_version):
            continue
        # The versioned testing.yaml workflow is available from 1.8 onward.
        # Preserve older stored rows instead of replacing them with current CI data.
        if tuple(map(int, tag_version.split("."))) < (1, 8, 0):
            continue
        chart_version = chart_versions.get(tag_version)
        if not chart_version:
            continue
        if not stable_version.fullmatch(chart_version):
            raise ValueError(f"Invalid stable Helm chart version: {chart_version!r}")

        response = requests.get(workflow_url.format(tag=tag), timeout=30)
        response.raise_for_status()
        kube_versions = parse_kube_versions(response.text)
        rows.append(OrderedDict(
            [
                ("version", tag_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("images", []),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        ))
        print_success(f"Fetched compatibility info for tag: {tag}")

    # Fetch and validate every candidate before changing the existing table.
    if not rows:
        raise ValueError("No chart-backed Argo Rollouts compatibility rows found")
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
