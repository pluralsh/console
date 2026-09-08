from __future__ import annotations

import re
from collections import OrderedDict

import requests
import yaml
from bs4 import BeautifulSoup
from packaging.version import InvalidVersion, Version

from utils import update_compatibility_info


app_name = "aerospike-kubernetes-operator"
compatibility_url = "https://aerospike.com/docs/kubernetes/install/requirements/"
helm_install_url = "https://aerospike.com/docs/kubernetes/install/helm/"
chart_index_url = "https://aerospike.github.io/aerospike-kubernetes-enterprise/index.yaml"
chart_name = "aerospike-kubernetes-operator"
compatibility_file = f"../../static/compatibilities/{app_name}.yaml"
stable_version = re.compile(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)")


def fetch_page(url: str) -> bytes:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def _decode(content: bytes | str, source: str) -> str:
    if isinstance(content, str):
        return content
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"Could not decode {source} as UTF-8") from exc


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def _content_scope(soup: BeautifulSoup):
    """Return the document content, excluding navigation and footer text."""
    return soup.find("main") or soup.find("article") or soup


def _section_text(content: bytes | str, title: str, source: str) -> str:
    soup = BeautifulSoup(_decode(content, source), "html.parser")
    scope = _content_scope(soup)
    headings = []
    for heading in scope.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        if heading.find_parent(["nav", "header", "footer"]):
            continue
        if _normalize(heading.get_text(" ", strip=True)) == _normalize(title):
            headings.append(heading)
    if len(headings) != 1:
        raise ValueError(
            f"Expected exactly one {title!r} section in the Aerospike source"
        )

    heading = headings[0]
    heading_level = int(heading.name[1])
    parts: list[str] = []

    # Aerospike's docs put each section's elements beside its heading in one
    # markdown-content container. Stop at the next heading of the same or
    # higher level so unrelated sections cannot contribute version numbers.
    for sibling in heading.next_siblings:
        if getattr(sibling, "name", None):
            sibling_level = re.fullmatch(r"h([1-6])", sibling.name)
            if sibling_level and int(sibling_level.group(1)) <= heading_level:
                break
        text = getattr(sibling, "get_text", lambda *args, **kwargs: str(sibling))(
            " ", strip=True
        )
        if text:
            parts.append(text)

    if not parts:
        raise ValueError(f"Aerospike {title!r} section is empty")
    return " ".join(parts)


def parse_supported_kubernetes_versions(content: bytes | str) -> list[str]:
    """Parse the bounded Supported Kubernetes versions section."""
    section = _section_text(
        content,
        "Supported Kubernetes versions",
        "Aerospike Kubernetes requirements page",
    )
    # Require the complete statement: exclusions or patch-level limits cannot
    # safely be represented as an inclusive list of Kubernetes minor versions.
    match = re.fullmatch(
        r"\s*Kubernetes\s+v?(1\.\d+)\s*"
        r"(?:to|through|[-\u2013\u2014])\s*"
        r"v?(1\.\d+)\.?\s*",
        section,
        flags=re.IGNORECASE,
    )
    if not match:
        raise ValueError(
            "Aerospike Kubernetes requirements section has a missing or ambiguous "
            "Kubernetes version range"
        )

    lower, upper = match.groups()
    lower_minor = int(lower.split(".")[1])
    upper_minor = int(upper.split(".")[1])
    if lower_minor > upper_minor:
        raise ValueError("Aerospike Kubernetes version range is reversed")
    if upper_minor > 100:
        raise ValueError("Aerospike Kubernetes version range exceeds the supported parser bound")
    return [f"1.{minor}" for minor in range(upper_minor, lower_minor - 1, -1)]


def parse_helm_install_version(content: bytes | str) -> str:
    """Read the version explicitly used by Aerospike's Helm install docs."""
    soup = BeautifulSoup(_decode(content, "Aerospike Helm install page"), "html.parser")
    scope = _content_scope(soup)
    commands = {
        node.get_text(" ", strip=True)
        for node in scope.find_all(["pre", "code"])
        if re.search(
            r"\bhelm\s+install\b.*\baerospike/aerospike-kubernetes-operator(?=\s|$)",
            node.get_text(" ", strip=True),
            flags=re.IGNORECASE,
        )
        and not node.find_parent(["nav", "header", "footer"])
    }
    version_pattern = re.compile(
        r"--version\s*(?:=\s*|\s+)"
        r"v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)"
        r"(?![0-9A-Za-z.+-])",
        flags=re.IGNORECASE,
    )
    versions = {
        match.group(1)
        for command in commands
        for match in version_pattern.finditer(command)
    }
    if len(versions) != 1:
        raise ValueError(
            "Aerospike Helm install page has a missing or ambiguous current operator version"
        )
    version = next(iter(versions))
    try:
        parsed = Version(version)
    except InvalidVersion as exc:
        raise ValueError(f"Invalid Aerospike operator version: {version!r}") from exc
    if parsed.is_prerelease or parsed.is_devrelease:
        raise ValueError(f"Aerospike Helm install page names a pre-release: {version!r}")
    if not stable_version.fullmatch(version):
        raise ValueError(f"Unsupported Aerospike chart version: {version!r}")
    return str(parsed)


def _stable_version(value: object, source: str) -> str | None:
    raw = str(value or "").strip().removeprefix("v")
    if not raw:
        raise ValueError(f"{source} is missing a version")
    try:
        parsed = Version(raw)
    except InvalidVersion as exc:
        raise ValueError(f"Invalid version in {source}: {raw!r}") from exc
    if parsed.is_prerelease or parsed.is_devrelease:
        return None
    if not stable_version.fullmatch(raw):
        raise ValueError(f"Unsupported stable version in {source}: {raw!r}")
    return str(parsed)


def parse_chart_versions(content: bytes | str) -> dict[str, str]:
    """Return stable operator appVersion -> chart version mappings."""
    try:
        parsed = yaml.safe_load(_decode(content, "Aerospike Helm index"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse Aerospike Helm index") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Aerospike Helm index is empty or malformed")
    entry_groups = parsed.get("entries")
    if not isinstance(entry_groups, dict):
        raise ValueError("Aerospike Helm index is missing chart entries")
    entries = entry_groups.get(chart_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"Aerospike Helm index has no {chart_name!r} chart entries")

    versions: dict[str, str] = {}
    chart_apps: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Aerospike Helm index contains a malformed chart entry")
        if entry.get("deprecated"):
            continue

        chart_version = _stable_version(
            entry.get("version"), "Aerospike Helm chart entry"
        )
        if chart_version is None:
            continue
        app_version = _stable_version(
            entry.get("appVersion"), "Aerospike Helm chart appVersion"
        )
        if app_version is None:
            continue
        if chart_version in chart_apps and chart_apps[chart_version] != app_version:
            raise ValueError(f"Conflicting appVersion values for Aerospike chart {chart_version}")
        chart_apps[chart_version] = app_version
        previous = versions.get(app_version)
        if previous is None or Version(chart_version) > Version(previous):
            versions[app_version] = chart_version

    if not versions:
        raise ValueError("Aerospike Helm index contains no stable operator charts")
    return versions


def build_rows(
    requirements_content: bytes | str,
    chart_index_content: bytes | str,
    helm_install_content: bytes | str,
) -> list[OrderedDict[str, object]]:
    """Build one current row; historical releases have no inferred support."""
    kube_versions = parse_supported_kubernetes_versions(requirements_content)
    chart_versions = parse_chart_versions(chart_index_content)
    documented_chart = parse_helm_install_version(helm_install_content)

    latest_chart = max(chart_versions.values(), key=Version)
    if documented_chart != latest_chart:
        raise ValueError(
            "Aerospike Helm install docs and chart index disagree on the current "
            f"chart version: {documented_chart} != {latest_chart}"
        )

    operator_versions = [
        app_version
        for app_version, chart_version in chart_versions.items()
        if chart_version == documented_chart
    ]
    if len(operator_versions) != 1:
        raise ValueError(
            "Aerospike Helm index has a missing or ambiguous appVersion for chart "
            f"{documented_chart}"
        )
    operator_version = operator_versions[0]

    return [
        OrderedDict(
            [
                ("version", operator_version),
                ("kube", kube_versions),
                ("chart_version", documented_chart),
                ("requirements", []),
                ("incompatibilities", []),
            ]
        )
    ]


def scrape() -> None:
    requirements = fetch_page(compatibility_url)
    if not requirements:
        raise ValueError("Could not fetch Aerospike Kubernetes requirements page")

    index = fetch_page(chart_index_url)
    if not index:
        raise ValueError("Could not fetch Aerospike Helm index")

    helm_install = fetch_page(helm_install_url)
    if not helm_install:
        raise ValueError("Could not fetch Aerospike Helm install page")

    rows = build_rows(requirements, index, helm_install)
    update_compatibility_info(
        compatibility_file,
        rows,
    )
