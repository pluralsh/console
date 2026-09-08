"""Collect Kubernetes versions targeted by each Trivy Operator release's CI."""

import re

import requests
import yaml
from packaging.version import Version

APP_NAME = "trivy-operator"
INDEX_URL = "https://aquasecurity.github.io/helm-charts/index.yaml"
WORKFLOW_URL = (
    "https://raw.githubusercontent.com/aquasecurity/trivy-operator/"
    "v{version}/.github/workflows/build.yaml"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
STABLE_VERSION = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")
ENV_REFERENCE = re.compile(r"\$\{\{\s*env\.([A-Za-z_][A-Za-z_0-9]*)\s*\}\}")
NODE_IMAGE = re.compile(r"kindest/node:v(\d+)\.(\d+)\.\d+(?:@sha256:[a-f0-9]{64})?")
KIND_ACTIONS = {"engineerd/setup-kind", "helm/kind-action"}


def stable_charts(content):
    """Map each exact stable application release to its latest stable chart."""
    index = yaml.safe_load(content)
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("Trivy Operator chart entries not found")

    versions = {}
    for chart in charts:
        if not isinstance(chart, dict):
            raise ValueError("Invalid Trivy Operator chart entry")
        app = chart.get("appVersion")
        version = chart.get("version")
        # Do not coerce YAML numbers or turn prerelease tags into GA releases.
        if not all(isinstance(v, str) and STABLE_VERSION.fullmatch(v) for v in (app, version)):
            continue
        app, version = app.removeprefix("v"), version.removeprefix("v")
        previous = versions.get(app)
        if previous is None or Version(version) > Version(previous):
            versions[app] = version
    if not versions:
        raise ValueError("No stable Trivy Operator charts found")
    return dict(sorted(versions.items(), key=lambda item: Version(item[0]), reverse=True))


def _environment(parent, values):
    if not isinstance(values, dict):
        raise ValueError("Invalid Trivy Operator workflow environment")
    return {**parent, **values}


def parse_kube_versions(content):
    """Resolve actual KIND setup inputs, including job/step env overrides.

    A configured but unused KIND_IMAGE is not compatibility evidence. Only
    concrete stable kindest/node images passed to cluster-setup actions count.
    """
    workflow = yaml.safe_load(content)
    jobs = workflow.get("jobs") if isinstance(workflow, dict) else None
    if not isinstance(jobs, dict) or not jobs:
        raise ValueError("Trivy Operator workflow jobs not found")
    environment = _environment({}, workflow.get("env", {}))
    versions = set()
    for job in jobs.values():
        if not isinstance(job, dict):
            raise ValueError("Invalid Trivy Operator workflow job")
        job_env = _environment(environment, job.get("env", {}))
        steps = job.get("steps", [])
        if not isinstance(steps, list):
            raise ValueError("Invalid Trivy Operator workflow steps")
        for step in steps:
            if not isinstance(step, dict):
                raise ValueError("Invalid Trivy Operator workflow step")
            action = str(step.get("uses", "")).split("@", 1)[0]
            if action not in KIND_ACTIONS:
                continue
            inputs = step.get("with", {})
            image = inputs.get("image") if isinstance(inputs, dict) else None
            if isinstance(image, str):
                reference = ENV_REFERENCE.fullmatch(image.strip())
                if reference:
                    step_env = _environment(job_env, step.get("env", {}))
                    image = step_env.get(reference.group(1))
            match = NODE_IMAGE.fullmatch(image) if isinstance(image, str) else None
            if not match:
                raise ValueError(f"Unresolved or invalid Trivy Operator KIND image: {image!r}")
            versions.add(f"{int(match[1])}.{int(match[2])}")
    if not versions:
        raise ValueError("No Kubernetes cluster setup found in Trivy Operator workflow")
    return sorted(versions, key=Version, reverse=True)


def build_rows(index_content, fetcher):
    rows = []
    for version, chart_version in stable_charts(index_content).items():
        content = fetcher(WORKFLOW_URL.format(version=version))
        if not content:
            raise ValueError(f"Missing Trivy Operator {version} workflow")
        rows.append({
            "version": version,
            "kube": parse_kube_versions(content),
            "chart_version": chart_version,
            "requirements": [],
            "incompatibilities": [],
        })
    return rows


def scrape():
    from utils import update_compatibility_info

    # Validate the entire upstream result before changing stored compatibility.
    # The common writer retains metadata and reduces redundant patch releases.
    with requests.Session() as session:
        def fetch(url):
            response = session.get(url, timeout=30)
            response.raise_for_status()
            return response.content

        rows = build_rows(fetch(INDEX_URL), fetch)
    update_compatibility_info(TARGET_FILE, rows)
