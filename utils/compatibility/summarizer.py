import os
import yaml
import json
import requests
from functools import lru_cache
from openai import OpenAI
from exa_py import Exa

exa = Exa(api_key=os.environ.get("EXA_API_KEY"))
oai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@lru_cache(maxsize=None)
def fetch_page(url):
    response = requests.get(url)
    if response.status_code != 200:
        return None
    return response.content.decode("utf-8")

def helm_summary(name, compatibility, from_vsn, to_vsn):
  chart_url = compatibility.get('chart_changelog')
  release_url = compatibility.get('release_url')
  if not release_url and not chart_url:
      return None

  if not from_vsn.get('chart_version') or not to_vsn.get('chart_version'):
      return None

  chart_urls = []
  if chart_url:
    chart_urls = list(set(chart_url["url"].replace('{chart_version}', vsn) for vsn in [from_vsn['chart_version'], to_vsn['chart_version']]))

  with open(os.path.join(os.path.dirname(__file__), "tools/version_summary.json")) as f:
    schema = json.load(f)

    pages = []
    for url in chart_urls:
        if chart_url["raw"]:
            content = fetch_page(url)
            if content:
                pages.append(content)

    release_urls = set(release_url.replace('{vsn}', vsn) for vsn in [from_vsn['version'], to_vsn['version']])
    response = exa.get_contents(list(release_urls), text=True)
    release_pages = [result.text for result in response.results if result.text]

    if not pages and not release_pages:
        return None

    prompt = f"I'll list all the release notes I've found for the upgrade of {name} from {from_vsn['version']} to {to_vsn['version']}:"
    if pages:
        prompt += f"Here are the helm changelogs for the update:\n\n" + "\n\n".join(pages)
    if release_pages:
        prompt += f"\n\nHere are the application release notes for the update:\n\n" + "\n\n".join(release_pages)

    response = oai_client.responses.create(
        model="gpt-5.2",
        instructions="You are an experienced devops engineer planning a helm upgrade.  You're given a changelog of a kubernetes component and asked to summarize it for a junior engineer to guide the upgrade process.",
        input=prompt,
        tool_choice="required",
        tools=[{
            "type": "function",
            "name": "summary",
            "description": "A summary of the changes required for updating the chart to the new version.",
            "parameters": schema
        }]
    )

    if len(response.output) > 0 and response.output[0].type == 'function_call':
        result = json.loads(response.output[0].arguments)
        if result["confident"]:
            result.pop("confident")
            return result
        
        print("Not confident in the summary, ignoring")
        
  return None
    

def kube_summary(contents, version, schema):
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

    if len(response.output) > 0 and response.output[0].type == 'function_call':
        summary = json.loads(response.output[0].arguments)
        if summary["confident"]:
            summary.pop("confident")
            return summary
    
    return None