import os
import yaml
import json
import requests
from openai import OpenAI
from utils import expand_kube_versions, current_kube_version, write_yaml, read_yaml, fetch_page

oai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def openai_summary(contents, version, schema):
    response = oai_client.responses.create(
        model="gpt-5.2",
        instructions="You are an experienced devops engineer planning a kubernetes upgrade.  You're given a changelog and asked to summarize it for use in an architecture review of the upgrade",
        input="Here is the current kubernetes changelog for version {version}:\n\n" + contents,
        tool_choice="required",
        tools=[{
            "type": "function",
            "name": "summary",
            "description": "A comprehensive summary of a Kubernetes release, do your best to include anything that would be relevent for an engineer considering a kubernetes upgrade.",
            "parameters": schema
        }]
    )
    print(response)

    if len(response.output) > 0 and response.output[0].type == 'function_call':
        summary = json.loads(response.output[0].arguments)
        if summary["confident"]:
            summary.pop("confident")
            return summary
    
    return None

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

            summary = openai_summary(response.decode("utf-8"), as_urls[url], schema)
            if summary:
                kube_versions.append({
                    "version": as_urls[url],
                    "summary": summary
                })

        kube_versions.extend(current["kube_changelog"] if current else [])

        write_yaml("../../static/kube_changelog.yaml", {"kube_changelog": kube_versions})
