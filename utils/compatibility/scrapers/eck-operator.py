from __future__ import annotations

import re
from collections import OrderedDict

from packaging.version import InvalidVersion, Version

from utils import fetch_page, get_chart_versions, update_compatibility_info

app_name = "eck-operator"
README_URL = "https://raw.githubusercontent.com/elastic/cloud-on-k8s/v{version}/README.md"
MIN_MAJOR = 3


def parse_kube_range(markdown: str) -> list[str]:
    match = re.search(
        r"^\s*[*-]\s+Kubernetes\s+1\.(\d+)\s*-\s*1\.(\d+)\s*$",
        markdown,
        re.MULTILINE,
    )
    if not match:
        raise ValueError("ECK Kubernetes support range not found")

    start, end = map(int, match.groups())
    if start > end:
        raise ValueError("ECK Kubernetes support range is reversed")

    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def latest_chart_per_minor(chart_versions: dict[str, str]) -> list[tuple[str, str]]:
    latest: dict[tuple[int, int], tuple[Version, str]] = {}

    for app_version, chart_version in chart_versions.items():
        try:
            parsed = Version(app_version)
        except InvalidVersion:
            continue

        if parsed.is_prerelease or parsed.is_devrelease or parsed.major < MIN_MAJOR:
            continue

        key = (parsed.major, parsed.minor)
        current = latest.get(key)
        if current is None or parsed > current[0]:
            latest[key] = (parsed, chart_version)

    return [
        (str(parsed), chart_version)
        for parsed, chart_version in sorted(
            latest.values(),
            key=lambda item: item[0],
            reverse=True,
        )
    ]


def build_rows(
    chart_versions: dict[str, str],
    fetcher=fetch_page,
) -> list[OrderedDict[str, object]]:
    candidates = latest_chart_per_minor(chart_versions)
    if not candidates:
        raise ValueError("No supported ECK Helm releases found")

    rows: list[OrderedDict[str, object]] = []
    for version, chart_version in candidates:
        url = README_URL.format(version=version)
        content = fetcher(url)
        if not content:
            raise ValueError(f"Could not fetch ECK {version} README")

        if isinstance(content, bytes):
            try:
                markdown = content.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ValueError(f"Could not decode ECK {version} README") from exc
        elif isinstance(content, str):
            markdown = content
        else:
            raise ValueError(f"Unexpected ECK {version} README payload")

        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", parse_kube_range(markdown)),
                    ("chart_version", chart_version),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )

    return rows


def scrape() -> None:
    chart_versions = get_chart_versions(app_name)
    if not chart_versions:
        raise ValueError("No official ECK Helm releases found")

    rows = build_rows(chart_versions)
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
