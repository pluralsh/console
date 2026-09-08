"""Read the tested Kubernetes matrix of each Calico release family from its own versioned docs."""

import posixpath
import re
from collections import OrderedDict
from copy import deepcopy

import requests

from utils import (
    get_chart_versions,
    get_github_releases,
    print_success,
    print_warning,
    read_yaml,
    update_compatibility_info,
)

app_name = "calico"
compatibility_url = "https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements#kubernetes-requirements"

# docs.tigera.io renders tigera/docs calico_versioned_docs/version-<family>. Current families
# live on main; retired families keep the same layout on archive branches.
docs_url = "https://raw.githubusercontent.com/tigera/docs/{ref}/calico_versioned_docs/version-{family}/{path}"
docs_refs = ("main", "archive-os-{family}", "archive-oss-{family}")
requirements_path = "getting-started/kubernetes/requirements.mdx"
stable_version = re.compile(r"\d+\.\d+\.\d+")
docs_version = re.compile(r"^\s*version:\s*'([^']*)',?\s*$", re.M)
partial_import = re.compile(r"""^import SystemRequirements from ['"]([^'"]+)['"]""", re.M)
tested_sentence = re.compile(r"^We test \S+ \S+ against the following Kubernetes versions\b")
tested_entry = re.compile(r"^\s*[-*]\s+v?(\d+\.\d+)\s*$")


def parse_kube_versions(content):
    """Tested Kubernetes minors from the bullet list that follows the 'We test ...' sentence."""
    lines = content.splitlines()
    starts = [index for index, line in enumerate(lines) if tested_sentence.match(line)]
    if len(starts) != 1:
        raise ValueError("Calico tested Kubernetes versions not found")
    index = starts[0] + 1
    while index < len(lines) and not lines[index].strip():
        index += 1
    versions = set()
    while index < len(lines) and lines[index].strip():
        entry = tested_entry.match(lines[index])
        if not entry:
            raise ValueError(f"Invalid tested Kubernetes entry: {lines[index]!r}")
        versions.add(entry.group(1))
        index += 1
    if not versions:
        raise ValueError("Calico tested Kubernetes versions list is empty")
    return sorted(versions, key=lambda version: tuple(map(int, version.split("."))), reverse=True)


def parse_docs_version(variables):
    """The release family a versioned docs directory describes, e.g. 'v3.32'."""
    found = docs_version.findall(variables)
    if len(found) != 1:
        raise ValueError("Calico docs version variable not found")
    return found[0]


def fetch_docs(ref, family, path):
    response = requests.get(docs_url.format(ref=ref, family=family, path=path), timeout=30)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.text


def family_kube_versions(family):
    """Tested Kubernetes minors for a release family, or None when its docs are not published."""
    for ref in (ref.format(family=family) for ref in docs_refs):
        variables = fetch_docs(ref, family, "variables.js")
        if variables is None:
            continue
        version = parse_docs_version(variables)
        if version != f"v{family}":
            raise ValueError(f"Calico docs version-{family} at {ref} describe {version}")
        content = fetch_docs(ref, family, requirements_path)
        imported = partial_import.search(content or "")
        if imported:
            partial = posixpath.join(posixpath.dirname(requirements_path), imported.group(1))
            content = fetch_docs(ref, family, posixpath.normpath(partial))
        if content is None:
            raise ValueError(f"Calico requirements page missing for version-{family} at {ref}")
        return parse_kube_versions(content)
    return None


def candidate_versions(existing_rows, releases, chart_versions):
    """Chart-backed stable versions: stored rows plus releases with a published chart."""
    candidates = OrderedDict()
    for row in existing_rows:
        version = str(row.get("version", ""))
        if stable_version.fullmatch(version) and row.get("chart_version"):
            candidates[version] = str(row["chart_version"])
    for release in releases:
        version = release.removeprefix("v")
        if stable_version.fullmatch(version) and chart_versions.get(version):
            candidates[version] = chart_versions[version]
    return candidates


def build_rows(existing_rows, candidates, kube_versions=family_kube_versions):
    """Rows with the family matrix applied; stored metadata is copied, unpublished families skipped."""
    existing = {str(row["version"]): row for row in existing_rows}
    matrices = {}
    rows = []
    for version, chart_version in candidates.items():
        family = version.rsplit(".", 1)[0]
        if family not in matrices:
            matrices[family] = kube_versions(family)
            if matrices[family] is None:
                print_warning(f"No published docs for Calico {family}; keeping stored rows")
            else:
                print_success(f"Calico {family} is tested against Kubernetes {matrices[family]}")
        if matrices[family] is None:
            continue
        row = OrderedDict(deepcopy(existing[version])) if version in existing else OrderedDict(
            [("version", version), ("kube", []), ("chart_version", chart_version),
             ("images", []), ("requirements", []), ("incompatibilities", [])]
        )
        row["version"] = version
        row["kube"] = list(matrices[family])
        row["chart_version"] = chart_version
        rows.append(row)
    return rows


def do_scrape(app_name, filepath=None):
    filepath = filepath or f"../../static/compatibilities/{app_name}.yaml"
    data = read_yaml(filepath)
    if not isinstance(data, dict) or not isinstance(data.get("versions"), list):
        raise ValueError(f"Invalid compatibility table: {filepath}")
    candidates = candidate_versions(
        data["versions"],
        get_github_releases("projectcalico", "calico"),
        get_chart_versions(app_name, "tigera-operator"),
    )
    # Every family is fetched and validated before the stored table changes.
    rows = build_rows(data["versions"], candidates)
    if not rows:
        raise ValueError("No source-backed Calico compatibility rows found")
    update_compatibility_info(filepath, rows)


def scrape():
    do_scrape(app_name)
