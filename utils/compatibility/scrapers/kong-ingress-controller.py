import hashlib
import io
import re
import tarfile
from urllib.parse import urljoin

import requests
import yaml
from packaging.version import Version

from utils import update_compatibility_info


APP_NAME = "kong-ingress-controller"
MATRIX_URL = "https://raw.githubusercontent.com/Kong/developer.konghq.com/main/app/kubernetes-ingress-controller/version-compatibility.md"
CHART_INDEX_URL = "https://charts.konghq.com/index.yaml"
REQUEST_TIMEOUT = 30


def fetch(url):
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.content


def minor_version(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)(?:\.\d+|\.x)?", str(value))
    if not match:
        raise ValueError(f"Unexpected Kong compatibility version: {value!r}")
    return f"{int(match[1])}.{int(match[2])}"


def parse_matrix(markdown):
    blocks = re.findall(
        r"{%\s*version_compatibility_table\s*%}(.*?){%\s*endversion_compatibility_table\s*%}",
        markdown,
        re.DOTALL,
    )
    matrices = [yaml.safe_load(block) for block in blocks]
    matrices = [
        matrix for matrix in matrices
        if isinstance(matrix, dict) and matrix.get("compatible_product") == "Kubernetes"
    ]
    if len(matrices) != 1:
        raise ValueError("Expected exactly one Kong Kubernetes compatibility table")

    matrix = matrices[0]
    declared = {minor_version(version) for version in matrix["versions"]}
    supported = {}
    for kube_version, controllers in matrix["compatible_versions"].items():
        if not isinstance(controllers, list):
            raise ValueError("Expected a list of compatible Kong controller versions")
        kube_version = minor_version(kube_version)
        for controller in controllers:
            controller = minor_version(controller)
            if controller not in declared:
                raise ValueError(f"Undeclared Kong controller version: {controller}")
            supported.setdefault(controller, set()).add(kube_version)

    if not supported:
        raise ValueError("Kong Kubernetes compatibility table is empty")
    return supported


def controller_minor(archive):
    # Read the bundled dependency, then apply the parent chart's values override.
    # Chart.yaml appVersion identifies Kong Gateway, not the ingress controller.
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as chart:
        with chart.extractfile("ingress/charts/kong/values.yaml") as values_file:
            dependency = yaml.safe_load(values_file)
        with chart.extractfile("ingress/values.yaml") as values_file:
            parent = yaml.safe_load(values_file)

    image = dict(dependency["ingressController"]["image"])
    override = parent.get("controller", {}).get("ingressController", {}).get("image", {})
    image.update(override)
    if image.get("repository") != "kong/kubernetes-ingress-controller":
        raise ValueError(f"Unexpected Kong controller image: {image.get('repository')!r}")
    return minor_version(image["tag"])


def chart_versions(controller_versions):
    index = yaml.safe_load(fetch(CHART_INDEX_URL))
    entries = [
        entry for entry in index["entries"]["ingress"]
        if re.fullmatch(r"\d+\.\d+\.\d+", str(entry["version"]))
    ]
    if not entries:
        raise ValueError("Kong chart index has no stable ingress charts")
    entries.sort(key=lambda entry: Version(str(entry["version"])), reverse=True)
    matched = {}
    for entry in entries:
        archive = fetch(urljoin(CHART_INDEX_URL, entry["urls"][0]))
        if hashlib.sha256(archive).hexdigest() != entry["digest"]:
            raise ValueError(f"Kong ingress chart {entry['version']} digest mismatch")
        controller = controller_minor(archive)
        if controller in controller_versions and controller not in matched:
            matched[controller] = str(entry["version"])
        if matched.keys() >= controller_versions:
            break
    return matched


def scrape():
    supported = parse_matrix(fetch(MATRIX_URL).decode("utf-8"))
    charts = chart_versions(set(supported))
    versions = []
    for controller in sorted(supported, key=Version, reverse=True):
        # Plural uses version rows as interval boundaries. The upstream table
        # covers a minor family, so .0 also covers its earlier patch releases.
        # Floating chart tags such as "3.5" establish no exact patch pin.
        row = {
            "version": f"{controller}.0",
            "kube": sorted(supported[controller], key=Version, reverse=True),
            "requirements": [],
            "incompatibilities": [],
        }
        if controller in charts:
            row["chart_version"] = charts[controller]
        versions.append(row)
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", versions)
