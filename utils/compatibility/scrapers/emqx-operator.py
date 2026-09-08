"""Join published EMQX charts to the Kubernetes requirements at each release tag."""

from __future__ import annotations

import re
from collections import OrderedDict

import requests
import yaml
from packaging.version import Version

app_name = "emqx-operator"
helm_index_url = "https://repos.emqx.io/charts/index.yaml"
readme_url = "https://raw.githubusercontent.com/emqx/emqx-operator/{version}/README.md"

_RELEASE = re.compile(r"\d+\.\d+\.\d+")
_REQUIREMENT = re.compile(
    r"^The EMQX Operator requires a Kubernetes cluster of version `>=(1\.\d+(?:\.0)?)`\.$",
    re.MULTILINE,
)
_PREREQUISITE = re.compile(
    r"^- Access to a Kubernetes v(1\.\d+)\+ cluster\.$", re.MULTILINE
)


def chart_releases(content: bytes | str) -> list[tuple[str, str]]:
    """Keep every stable app release, choosing its newest published stable chart."""
    index = yaml.safe_load(content)
    catalog = index.get("entries") if isinstance(index, dict) else None
    entries = catalog.get(app_name) if isinstance(catalog, dict) else None
    if not isinstance(entries, list) or not entries:
        raise ValueError("EMQX Operator chart entries not found")

    releases: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed EMQX Operator chart entry")
        chart = str(entry.get("version", ""))
        version = str(entry.get("appVersion", ""))
        # Neither chart prereleases nor app prereleases establish stable compatibility.
        if not _RELEASE.fullmatch(chart) or not _RELEASE.fullmatch(version):
            continue
        if version not in releases or Version(chart) > Version(releases[version]):
            releases[version] = chart
    if not releases:
        raise ValueError("No stable EMQX Operator application/chart pairs found")
    return sorted(releases.items(), key=lambda pair: Version(pair[0]), reverse=True)


def supported_kubernetes(content: bytes | str, current: str) -> list[str]:
    """Expand only explicit >=, + or 'latest' requirements through KUBE_VERSION.

    Quoted conditional requirements (for deployments without particular features)
    are intentionally excluded. Unknown or changed support declarations fail closed.
    """
    markdown = content.decode("utf-8") if isinstance(content, bytes) else content
    declarations = _REQUIREMENT.findall(markdown) + _PREREQUISITE.findall(markdown)
    minimums = {".".join(value.split(".")[:2]) for value in declarations}
    if len(minimums) != 1:
        raise ValueError("Missing or conflicting EMQX Kubernetes requirement")
    minimum = minimums.pop()

    # When upstream publishes a detailed table, accept its full-feature row only.
    # A newly introduced upper bound or changed qualification must be reviewed.
    columns = None
    table_found = False
    full_support = []
    for line in markdown.splitlines():
        if not line.strip().startswith("|"):
            columns = None
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if "EMQX Operator Compatibility" in cells:
            if "Kubernetes Versions" not in cells:
                raise ValueError("Unexpected EMQX Kubernetes table columns")
            table_found = True
            columns = (cells.index("Kubernetes Versions"), cells.index("EMQX Operator Compatibility"))
        elif columns and len(cells) > max(columns):
            if cells[columns[1]] == "All functions supported":
                full_support.append(cells[columns[0]])
    if table_found:
        if len(full_support) != 1:
            raise ValueError("Missing or ambiguous EMQX full-feature Kubernetes range")
        match = re.fullmatch(
            r"(1\.\d+)(?: or higher| \(included\) [~～] latest)", full_support[0]
        )
        if not match or match.group(1) != minimum:
            raise ValueError("Unexpected EMQX full-feature Kubernetes range")

    if not re.fullmatch(r"1\.\d+", current):
        raise ValueError("Invalid current Kubernetes minor version")
    first = int(minimum.split(".")[1])
    last = int(current.split(".")[1])
    if first > last:
        raise ValueError("EMQX Kubernetes requirement is newer than KUBE_VERSION")
    return [f"1.{minor}" for minor in range(last, first - 1, -1)]


def build_rows(index: bytes | str, current: str, fetcher) -> list[OrderedDict]:
    rows = []
    for version, chart in chart_releases(index):
        source = readme_url.format(version=version)
        content = fetcher(source)
        if not content:
            raise ValueError(f"Missing EMQX {version} release README: {source}")
        try:
            kube = supported_kubernetes(content, current)
        except (ValueError, UnicodeError) as exc:
            raise ValueError(f"Invalid EMQX {version} release requirements: {exc}") from exc
        rows.append(OrderedDict([
            ("version", version),
            ("kube", kube),
            ("chart_version", chart),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
    return rows


def scrape() -> None:
    from utils import current_kube_version, update_compatibility_info

    current = current_kube_version()
    if not current:
        raise ValueError("KUBE_VERSION is unavailable")
    # Resolve every release before writing so a source outage cannot publish a partial table.
    with requests.Session() as session:
        def fetch_document(url: str) -> bytes:
            response = session.get(url, timeout=(10, 30))
            response.raise_for_status()
            return response.content

        index = fetch_document(helm_index_url)
        rows = build_rows(index, current, fetch_document)
    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", rows)
