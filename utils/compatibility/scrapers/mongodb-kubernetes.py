from __future__ import annotations

import re
from collections import OrderedDict

import yaml
from bs4 import BeautifulSoup
from packaging.version import InvalidVersion, Version

from utils import fetch_page, update_compatibility_info

app_name = "mongodb-kubernetes"
compatibility_url = (
    "https://www.mongodb.com/docs/kubernetes/current/tutorial/"
    "plan-k8s-op-compatibility/"
)
chart_index_url = "https://mongodb.github.io/helm-charts/index.yaml"
chart_name = "mongodb-kubernetes"


def _decode(content: bytes | str, source: str) -> str:
    if isinstance(content, str):
        return content
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"Could not decode {source} as UTF-8") from exc


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def parse_chart_versions(content: bytes | str) -> dict[str, str]:
    try:
        parsed = yaml.safe_load(_decode(content, "MongoDB Helm index"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse MongoDB Helm index") from exc

    if not isinstance(parsed, dict):
        raise ValueError("MongoDB Helm index is empty or malformed")

    entries = parsed.get("entries", {}).get(chart_name)
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"MongoDB Helm index has no {chart_name!r} chart entries")

    versions: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        raw = str(entry.get("version", "")).lstrip("v")
        try:
            parsed_version = Version(raw)
        except InvalidVersion:
            continue
        if parsed_version.is_prerelease or parsed_version.is_devrelease:
            continue
        versions.setdefault(raw, raw)

    if not versions:
        raise ValueError("MongoDB Helm index contains no stable chart versions")
    return versions


def _find_compatibility_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [_normalize(cell.get_text(" ", strip=True)) for cell in table.find_all("th")]
        if not headers:
            continue
        if any("kubernetes operator release series" in header for header in headers) and any(
            header == "kubernetes version" for header in headers
        ):
            return table, headers
    raise ValueError("MongoDB Kubernetes compatibility table not found")


def _extract_release(value: str) -> str:
    match = re.search(r"(?<!\d)(\d+\.\d+\.\d+)(?!\d)", value)
    if not match:
        raise ValueError(f"Unsupported MongoDB Operator release cell: {value!r}")
    version = match.group(1)
    try:
        parsed = Version(version)
    except InvalidVersion as exc:
        raise ValueError(f"Invalid MongoDB Operator release: {version!r}") from exc
    if parsed.is_prerelease or parsed.is_devrelease:
        raise ValueError(f"Unsupported pre-release MongoDB Operator version: {version!r}")
    return version


def _extract_kube_versions(value: str) -> list[str]:
    versions = re.findall(r"(?<!\d)(1\.\d+)(?!\d)", value)
    if not versions:
        raise ValueError(f"No Kubernetes versions found in compatibility cell: {value!r}")

    unique = {version for version in versions}
    return sorted(unique, key=lambda item: int(item.split(".")[1]), reverse=True)


def parse_compatibility_page(
    content: bytes | str, chart_versions: dict[str, str]
) -> list[OrderedDict[str, object]]:
    html = _decode(content, "MongoDB compatibility page")
    soup = BeautifulSoup(html, "html.parser")
    table, headers = _find_compatibility_table(soup)

    try:
        release_idx = next(
            i for i, header in enumerate(headers) if "kubernetes operator release series" in header
        )
        kube_idx = headers.index("kubernetes version")
    except (StopIteration, ValueError) as exc:
        raise ValueError("Unexpected MongoDB compatibility table columns") from exc

    rows: list[OrderedDict[str, object]] = []
    seen: set[str] = set()

    for tr in table.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue
        if len(cells) <= max(release_idx, kube_idx):
            raise ValueError("Malformed MongoDB compatibility table row")

        version = _extract_release(cells[release_idx].get_text(" ", strip=True))
        if version in seen:
            raise ValueError(f"Duplicate MongoDB Operator compatibility row: {version}")
        seen.add(version)

        chart_version = chart_versions.get(version)
        if not chart_version:
            # Do not invent an operator/chart pairing that MongoDB has not
            # published in its official Helm repository.
            continue

        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", _extract_kube_versions(cells[kube_idx].get_text(" ", strip=True))),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    if not rows:
        raise ValueError("No MongoDB Operator releases matched official Helm charts")

    return sorted(rows, key=lambda row: Version(str(row["version"])), reverse=True)


def scrape() -> None:
    index = fetch_page(chart_index_url)
    if not index:
        raise ValueError("Could not fetch MongoDB Helm index")
    chart_versions = parse_chart_versions(index)

    page = fetch_page(compatibility_url)
    if not page:
        raise ValueError("Could not fetch MongoDB Kubernetes compatibility page")

    rows = parse_compatibility_page(page, chart_versions)
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
