# scrapers/cert_manager.py

from collections import OrderedDict

import requests
import yaml

from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    print_success,
)

app_name = "argo-rollouts"
github_api_tags_url = "https://api.github.com/repos/argoproj/argo-rollouts/tags"


def fetch_github_tags():
    response = requests.get(github_api_tags_url)
    if response.status_code != 200:
        print_error(
            f"Failed to fetch GitHub tags. Status code: {response.status_code}"
        )
        return []
    return [tag["name"] for tag in response.json()]


def scrape():
    release_tags = fetch_github_tags()
    if not release_tags:
        print_error("No release tags found.")
        return

    rows = []
    for tag in release_tags:
        response = requests.get(
            f"https://raw.githubusercontent.com/argoproj/argo-rollouts/refs/tags/{tag}/.github/workflows/testing.yaml")
        if response.status_code != 200:
            print_error(f"Failed to fetch compatibility info for tag {tag}. Status code: {response.status_code}")
            continue

        content = yaml.safe_load(response.text)
        if not content:
            print_error(f"Failed to parse compatibility info for {tag}")
            return

        matrix = content.get("jobs", {}).get("test-e2e", {}).get("strategy", {}).get("matrix", {}).get("kubernetes", [])
        kube_versions = [entry["version"] for entry in matrix]
        rows.append(OrderedDict(
            [
                ("version", tag.lstrip("v")),
                ("kube", kube_versions),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        ))
        print_success(f"Fetched compatibility info for tag: {tag}")

    print_success(rows)

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
    update_chart_versions(app_name)
