import os
import yaml
import json
from utils import expand_kube_versions, current_kube_version, write_yaml, read_yaml, fetch_page
from summarizer import kube_summary

def generate_kube_changelog():
    vsns = expand_kube_versions("1.20", current_kube_version())
    as_urls = {f"https://raw.githubusercontent.com/kubernetes/kubernetes/refs/heads/master/CHANGELOG/CHANGELOG-{vsn}.md": vsn for vsn in vsns}

    current = read_yaml("../../static/kube_changelog.yaml")
    current_versions = set(kube_version["version"] for kube_version in current["kube_changelog"]) if current else set()

    with open(os.path.join(os.path.dirname(__file__), "tools/kube_version.json")) as f:
        schema = json.load(f)

        kube_versions = []
        for url in as_urls.keys():
            if as_urls[url] in current_versions:
                continue

            response = fetch_page(url)
            if not response:
                continue

            summary = kube_summary(response.decode("utf-8"), as_urls[url], schema)
            if summary:
                kube_versions.append({
                    "version": as_urls[url],
                    "summary": summary
                })

        kube_versions.extend(current["kube_changelog"] if current else [])

        write_yaml("../../static/kube_changelog.yaml", {"kube_changelog": kube_versions})
