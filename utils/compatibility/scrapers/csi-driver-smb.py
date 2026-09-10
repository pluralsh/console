"""SMB CSI compatibility from explicit upstream rows, not inferred release dates.

The Kubernetes list means the upstream declared minimum through KUBE_VERSION.
It is not a matrix of combinations tested here. Historical releases absent from
upstream's current table are not invented. The shared updater preserves stored
versions and handles Helm image enrichment; it is not reimplemented here.
"""

from __future__ import annotations

import re
from collections import OrderedDict
from typing import Any

import yaml

APP_NAME = "csi-driver-smb"
README_URL = (
    "https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/README.md"
)
HELM_REPOSITORY_URL = (
    "https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts"
)
INDEX_URL = HELM_REPOSITORY_URL + "/index.yaml"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
_STABLE = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")
_UNSTABLE = re.compile(r"v?\d+\.\d+\.\d+[-+][0-9A-Za-z.-]+")
_MINOR = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)")


class SourceError(ValueError):
    """Stop before updating the catalog when a source is ambiguous or incomplete."""


class _UniqueKeyLoader(yaml.SafeLoader):
    """Reject ambiguous YAML mappings instead of silently keeping the last key."""

    def construct_mapping(self, node, deep=False):
        if not isinstance(node, yaml.MappingNode):
            raise SourceError("Expected a Helm YAML mapping")
        result = {}
        for key_node, value_node in node.value:
            if key_node.tag == "tag:yaml.org,2002:merge":
                raise SourceError("Helm YAML merge keys are not supported")
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str) or key in result:
                raise SourceError("Non-string or duplicate Helm YAML key")
            result[key] = self.construct_object(value_node, deep=deep)
        return result


def load_chart_index(raw: str) -> Any:
    """Load bounded, unambiguous source text using SafeLoader constructors only."""
    if not isinstance(raw, str) or len(raw.encode("utf-8")) > 4 * 1024 * 1024:
        raise SourceError("Helm YAML index is missing or too large")
    # Current upstream uses no aliases. Reject aliases/merges rather than accept
    # hidden overrides or recursive graphs the subsequent matching cannot audit.
    for token in yaml.scan(raw):
        if isinstance(token, yaml.AliasToken):
            raise SourceError("Helm YAML aliases are not supported")
    return yaml.load(raw, Loader=_UniqueKeyLoader)


def stable_version(value: Any) -> tuple[int, int, int] | None:
    if not isinstance(value, str):
        return None
    match = _STABLE.fullmatch(value)
    return tuple(map(int, match.groups())) if match else None


def _minor(value: str) -> tuple[int, int]:
    match = _MINOR.fullmatch(value) if isinstance(value, str) else None
    if not match:
        raise SourceError("Expected an explicit Kubernetes major.minor version")
    result = tuple(map(int, match.groups()))
    # This source and repository store Kubernetes 1.x minors. Never guess the
    # last minor of an earlier major when a future major is introduced.
    if result[0] != 1 or result[1] > 999:
        raise SourceError("Unsupported Kubernetes version range")
    return result


def expand_declared_minimum(spec: str, ceiling: str) -> list[str]:
    """Expand only upstream's documented `1.N+` form, inclusively and bounded."""
    if not isinstance(spec, str) or not spec.endswith("+"):
        raise SourceError("Unsupported SMB Kubernetes constraint")
    lower = _minor(spec[:-1])
    upper = _minor(ceiling)
    if lower > upper:
        raise SourceError("Declared minimum is newer than KUBE_VERSION")
    return [f"1.{minor}" for minor in range(upper[1], lower[1] - 1, -1)]


def _cells(line: str) -> list[str]:
    text = line.strip()
    if not text.startswith("|") or not text.endswith("|"):
        raise SourceError("Malformed compatibility table row")
    return [cell.strip() for cell in text[1:-1].split("|")]


def parse_compatibility_table(markdown: str) -> dict[str, str]:
    """Return concrete stable app versions mapped to their own minimum string."""
    if not isinstance(markdown, str):
        raise SourceError("Expected Markdown text")
    lines = markdown.splitlines()
    header_rows = []
    for pos, line in enumerate(lines):
        if line.strip().startswith("|") and "Driver Version" in line:
            cells = _cells(line)
            if "Driver Version" in cells and "Supported K8s Version" in cells:
                header_rows.append((pos, cells))
    if len(header_rows) != 1:
        raise SourceError("Expected exactly one SMB compatibility table")
    pos, header = header_rows[0]
    if header.count("Driver Version") != 1 or header.count("Supported K8s Version") != 1:
        raise SourceError("Duplicate compatibility column")
    if pos + 1 >= len(lines):
        raise SourceError("Missing Markdown table separator")
    separator = _cells(lines[pos + 1])
    if len(separator) != len(header) or not all(
        re.fullmatch(r":?-{3,}:?", cell) for cell in separator
    ):
        raise SourceError("Invalid Markdown table separator")
    version_index = header.index("Driver Version")
    kube_index = header.index("Supported K8s Version")
    result: dict[str, str] = {}
    for line in lines[pos + 2 :]:
        if not line.strip().startswith("|"):
            break
        cells = _cells(line)
        if len(cells) != len(header):
            raise SourceError("Incomplete compatibility table row")
        raw_version = cells[version_index]
        if raw_version in {"master branch", "main branch", "HEAD"}:
            continue
        version_tuple = stable_version(raw_version)
        if version_tuple is None:
            if _UNSTABLE.fullmatch(raw_version):
                continue
            raise SourceError("Unrecognized driver release in compatibility table")
        version = ".".join(map(str, version_tuple))
        minimum = cells[kube_index]
        # Validate the source even before combining it with the repository ceiling.
        if not minimum.endswith("+"):
            raise SourceError("Unsupported SMB Kubernetes constraint")
        _minor(minimum[:-1])
        if version in result and result[version] != minimum:
            raise SourceError("Conflicting compatibility rows for one release")
        result[version] = minimum
    if not result:
        raise SourceError("No stable releases in SMB compatibility table")
    return result


def match_stable_charts(index: Any) -> dict[str, str]:
    """Exact app matching; latest stable chart; retain the actual chart v-prefix.

    A chart version identifying different app versions is treated as conflicting
    metadata. We never select an RC or use another patch of the app as a substitute.
    """
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise SourceError("Invalid Helm index")
    entries = index["entries"].get(APP_NAME)
    if not isinstance(entries, list) or not entries:
        raise SourceError("No SMB entries in Helm index")
    selected: dict[str, tuple[tuple[int, int, int], str]] = {}
    chart_identity: dict[tuple[int, int, int], tuple[str, str]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise SourceError("Invalid Helm chart entry")
        deprecated = entry.get("deprecated", False)
        if not isinstance(deprecated, bool):
            raise SourceError("Invalid Helm deprecation flag")
        if deprecated:
            continue
        app_tuple = stable_version(entry.get("appVersion"))
        chart_tuple = stable_version(entry.get("version"))
        if app_tuple is None or chart_tuple is None:
            continue
        if entry.get("name") != APP_NAME:
            raise SourceError("Helm chart name does not match SMB")
        app = ".".join(map(str, app_tuple))
        raw_chart = entry["version"]
        identity = (app, raw_chart)
        if chart_tuple in chart_identity and chart_identity[chart_tuple] != identity:
            raise SourceError("Ambiguous normalized Helm chart version")
        chart_identity[chart_tuple] = identity
        if app not in selected or chart_tuple > selected[app][0]:
            selected[app] = (chart_tuple, raw_chart)
    return {app: chart[1] for app, chart in selected.items()}


def extract_versions(markdown: str, index: Any, ceiling: str) -> list[OrderedDict]:
    _minor(ceiling)
    documented = parse_compatibility_table(markdown)
    charts = match_stable_charts(index)
    versions = []
    for version in sorted(documented, key=stable_version, reverse=True):
        if version not in charts:
            raise SourceError(f"No stable Helm chart for documented release {version}")
        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", expand_declared_minimum(documented[version], ceiling)),
                    ("chart_version", charts[version]),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return versions


def _decode(value: bytes | str | None) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="strict")
    if isinstance(value, str):
        return value
    raise SourceError("Source could not be retrieved")


def scrape() -> None:
    # Delayed import keeps parser tests independent of the existing Helm/LLM
    # utility import graph. These are the real Plural integration entry points.
    from utils import current_kube_version, fetch_page, print_error, update_compatibility_info

    try:
        ceiling = current_kube_version()
        _minor(ceiling)
        markdown = _decode(fetch_page(README_URL))
        raw_index = _decode(fetch_page(INDEX_URL))
        index = load_chart_index(raw_index)
        versions = extract_versions(markdown, index, ceiling)
    except Exception as error:
        # Retrieval/parsing failures must not call the writer with partial rows.
        # Actual update/Helm execution is outside this catch and is the existing
        # updater's responsibility, not evidence of success from this function.
        print_error(f"SMB compatibility sources not usable: {type(error).__name__}")
        return
    update_compatibility_info(TARGET_FILE, versions)
