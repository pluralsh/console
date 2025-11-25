# scrapers/vector.py

from collections import OrderedDict

import requests
import yaml
import re
import json

from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    print_success,
)

app_name = "vector"
github_api_tags_url = "https://api.github.com/repos/vectordotdev/vector/tags"


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

    chart_versions = get_chart_versions(app_name)
    rows = []
    for tag in release_tags:
        tag_version = tag.lstrip("v")
        chart_version = chart_versions.get(f"{tag_version}-distroless-libc")

        # Skip if there's no chart version mapped
        if not chart_version:
            continue

        response = requests.get(
            f"https://raw.githubusercontent.com/vectordotdev/vector/refs/tags/{tag}/.github/workflows/k8s_e2e.yml")
        if response.status_code != 200:
            print_error(f"Failed to fetch compatibility info for tag {tag}. Status code: {response.status_code}")
            continue

        content = yaml.safe_load(response.text)
        if not content:
            print_error(f"Failed to parse compatibility info for {tag}")
            return

        # fixme https://raw.githubusercontent.com/vectordotdev/vector/master/.github/workflows/k8s_e2e.yml
        matrix = content.get("jobs", {}).get("compute-k8s-test-plan", {}).get("steps", [])

        if not matrix:
            continue

        script_content = matrix[0].get("with").get("script")

        match = re.search(r'const kubernetes_version = (\[[\s\S]*?])', script_content)

        if not match:
            continue # failed to parse kubernetes_version from script for tag

        # Replace JavaScript object notation with JSON
        json_str = match.group(1)
        json_str = re.sub(r'{\s*version:', '{"version":', json_str)
        json_str = re.sub(r',\s*is_essential:', ',"is_essential":', json_str)
        json_str = re.sub(r"'", '"', json_str)
        json_str = re.sub(r',(\s*[\]}])', r'\1', json_str)

        k8sver = json.loads(json_str)
        kube_versions = [entry["version"].lstrip("v") for entry in k8sver]

        print(kube_versions)

        rows.append(OrderedDict(
            [
                ("version", tag_version),
                ("kube", kube_versions),
                ("chart_version", chart_version),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        ))
        print_success(f"Fetched compatibility info for tag: {tag}")

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
