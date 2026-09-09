"""vSphere CPI releases track the corresponding Kubernetes major/minor.

Upstream policy: https://kubernetes.github.io/cloud-provider-vsphere/
Chart installation: https://github.com/kubernetes/cloud-provider-vsphere/blob/master/docs/book/tutorials/kubernetes-on-vsphere-with-helm.md
"""
import re
from collections import OrderedDict

import requests
import yaml

from utils import print_error, update_compatibility_info, validate_semver


APP_NAME = "vsphere-cpi"
HELM_INDEX_URL = "https://kubernetes.github.io/cloud-provider-vsphere/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        return None
    return validate_semver(value.removeprefix("v"))


def extract_versions(index):
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise ValueError("Missing Helm index entries.")
    entries = index["entries"].get(APP_NAME)
    if not isinstance(entries, list) or not entries:
        raise ValueError("No vSphere CPI charts found.")

    # A chart can be republished under a newer chart version for the same CPI
    # release. Pick that chart by semver; never infer CPI from the chart version.
    charts = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Unexpected chart entry.")
        app_version = stable_version(entry.get("appVersion"))
        chart_version = stable_version(entry.get("version"))
        if not app_version or not chart_version or entry.get("deprecated") is True:
            continue
        # The documented versioning policy applies to the Kubernetes 1.x CPI.
        if app_version.major != 1:
            continue
        if app_version not in charts or chart_version > charts[app_version]:
            charts[app_version] = chart_version

    if not charts:
        raise ValueError("No stable CPI releases with chart metadata found.")
    return [
        OrderedDict([
            ("version", str(app)),
            ("kube", [f"{app.major}.{app.minor}"]),
            ("requirements", []),
            ("incompatibilities", []),
            ("chart_version", str(charts[app])),
        ])
        for app in sorted(charts, reverse=True)
    ]


def scrape():
    try:
        response = requests.get(HELM_INDEX_URL, timeout=30)
        response.raise_for_status()
        versions = extract_versions(yaml.safe_load(response.content))
    except (requests.RequestException, yaml.YAMLError, ValueError) as error:
        print_error(f"Could not read vSphere CPI release metadata: {error}")
        return
    update_compatibility_info(TARGET_FILE, versions)
