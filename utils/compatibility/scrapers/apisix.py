import re
from collections import OrderedDict

import yaml
from packaging.version import InvalidVersion, Version

app_name = "apisix"
helm_index_url = "https://apache.github.io/apisix-helm-chart/index.yaml"
chart_readme_url = (
    "https://raw.githubusercontent.com/apache/apisix-helm-chart/"
    "apisix-{chart_version}/charts/apisix/README.md"
)


_MIN_KUBE_RE = re.compile(r"Kubernetes\s+v?(1\.\d+)\+", re.IGNORECASE)
_RELEASE_VERSION_RE = re.compile(r"\d+\.\d+\.\d+")


def _decode_text(payload: bytes | str, source: str) -> str:
    if isinstance(payload, bytes):
        try:
            return payload.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError(f"Could not decode {source}") from exc
    if isinstance(payload, str):
        return payload
    raise ValueError(f"Unexpected {source} payload type")


def parse_min_kubernetes(markdown: str) -> str:
    match = _MIN_KUBE_RE.search(markdown)
    if not match:
        raise ValueError("APISIX minimum Kubernetes version not found")
    return match.group(1)


def expand_minimum(minimum: str, current: str) -> list[str]:
    start = int(minimum.split(".")[1])
    end = int(current.split(".")[1])
    if start > end:
        raise ValueError(
            f"APISIX minimum Kubernetes {minimum} is newer than Plural {current}"
        )
    return [f"1.{minor}" for minor in range(end, start - 1, -1)]


def stable_charts_by_app_minor(index_payload: bytes | str):
    try:
        index = yaml.safe_load(_decode_text(index_payload, "APISIX Helm index"))
    except yaml.YAMLError as exc:
        raise ValueError("Could not parse APISIX Helm index") from exc
    if not isinstance(index, dict):
        raise ValueError("Unexpected APISIX Helm index structure")
    entry_groups = index.get("entries", {})
    if not isinstance(entry_groups, dict):
        raise ValueError("Unexpected APISIX Helm index entries structure")
    entries = entry_groups.get("apisix")
    if not isinstance(entries, list) or not entries:
        raise ValueError("APISIX chart entries not found")
    grouped = {}
    seen = set()

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        chart_raw = str(entry.get("version", "")).strip().lstrip("v")
        app_raw = str(entry.get("appVersion", "")).strip().lstrip("v")
        if not chart_raw or not app_raw or chart_raw in seen:
            continue
        if not _RELEASE_VERSION_RE.fullmatch(chart_raw) or not _RELEASE_VERSION_RE.fullmatch(
            app_raw
        ):
            continue
        try:
            chart = Version(chart_raw)
            app = Version(app_raw)
        except InvalidVersion:
            continue
        annotations = entry.get("annotations", {})
        if not isinstance(annotations, dict):
            continue
        prerelease = str(
            annotations.get("artifacthub.io/prerelease", "false")
        ).lower() == "true"
        if (
            chart.is_prerelease
            or chart.is_devrelease
            or app.is_prerelease
            or prerelease
        ):
            continue

        seen.add(chart_raw)
        grouped.setdefault((app.major, app.minor), []).append(
            (app, chart, app_raw, chart_raw)
        )

    if not grouped:
        raise ValueError("No stable APISIX charts found")

    result = []
    for key in sorted(grouped, reverse=True):
        candidates = sorted(
            grouped[key], key=lambda item: (item[0], item[1]), reverse=True
        )
        result.append(
            [(app_raw, chart_raw) for _, _, app_raw, chart_raw in candidates]
        )
    return result


def build_rows(index_payload: bytes | str, current_kube: str, fetcher):
    rows = []
    for candidates in stable_charts_by_app_minor(index_payload):
        for app_version, chart_version in candidates:
            page = fetcher(chart_readme_url.format(chart_version=chart_version))
            if not page:
                continue
            markdown = _decode_text(page, f"APISIX chart {chart_version} README")
            try:
                minimum = parse_min_kubernetes(markdown)
            except ValueError:
                continue
            rows.append(
                OrderedDict(
                    [
                        ("version", app_version),
                        ("kube", expand_minimum(minimum, current_kube)),
                        ("chart_version", chart_version),
                        ("requirements", []),
                        ("incompatibilities", []),
                    ]
                )
            )
            break
    if not rows:
        raise ValueError("No documented APISIX compatibility rows generated")
    return rows


def scrape() -> None:
    from utils import current_kube_version, fetch_page, update_compatibility_info

    index = fetch_page(helm_index_url)
    if not index:
        raise ValueError("Could not fetch official APISIX Helm index")

    current = current_kube_version()
    if not current:
        raise ValueError("Plural current Kubernetes version is unavailable")

    rows = build_rows(index, current, fetch_page)
    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml",
        rows,
    )
