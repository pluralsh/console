"""Join the vendor's tested recommendation table to released Helm charts.

Recommendations are version relationships, not a promise of current full support:
component minima, feature restrictions and Kubernetes/OpenShift end-of-support
still apply. Keep recorded releases when the moving recommendation changes.
"""

from collections import OrderedDict
import re

from bs4 import BeautifulSoup
import requests
import yaml

from utils import print_error, read_yaml, reduce_versions, update_compatibility_info


APP_NAME = "dynatrace-operator"
SUPPORT_URL = (
    "https://docs.dynatrace.com/docs/ingest-from/technology-support/support-model-and-issues"
)
HELM_INDEX_URL = (
    "https://raw.githubusercontent.com/Dynatrace/dynatrace-operator/main/config/helm/repos/stable/index.yaml"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"v?\d+\.\d+\.\d+", value):
        return None
    return tuple(map(int, value.lstrip("v").split(".")))


def _recommendation(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+|x)(\+)?", value)
    if not match or (match[3] == "x" and match[4]):
        raise ValueError(f"Unsupported Dynatrace recommendation: {value!r}")
    minor = (int(match[1]), int(match[2]))
    if match[3] == "x":
        return "minor", minor
    return ("at_least" if match[4] else "exact"), minor + (int(match[3]),)


def _matches(version, rule):
    kind, boundary = rule
    if kind == "at_least":
        return version >= boundary
    if kind == "minor":
        return version[:2] == boundary
    return version == boundary


def parse_support_table(content):
    soup = BeautifulSoup(content, "html.parser")
    required = ("Kubernetes upstream version", "Recommended Dynatrace Operator version")
    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")
                   if th.find_parent("table") is table]
        if all(name in headers for name in required):
            break
    else:
        raise ValueError("Dynatrace recommendation table not found")
    if any(headers.count(name) != 1 for name in required):
        raise ValueError("Ambiguous Dynatrace recommendation headers")
    kube_idx, recommended_idx = (headers.index(name) for name in required)
    recommendations = {}
    for row in table.find_all("tr"):
        if row.find_parent("table") is not table:
            continue
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td", recursive=False)]
        if not cells:
            continue
        if len(cells) != len(headers):
            raise ValueError("Incomplete Dynatrace recommendation row")
        kube = cells[kube_idx]
        if not re.fullmatch(r"\d+\.\d+", kube):
            raise ValueError(f"Invalid Kubernetes version: {kube!r}")
        rule = _recommendation(cells[recommended_idx])
        if kube in recommendations and recommendations[kube] != rule:
            raise ValueError(f"Conflicting Dynatrace recommendations for Kubernetes {kube}")
        recommendations[kube] = rule
    if not recommendations:
        raise ValueError("Empty Dynatrace recommendation table")
    return recommendations


def parse_helm_versions(content):
    index = yaml.safe_load(content)
    entries = index.get("entries") if isinstance(index, dict) else None
    charts = entries.get(APP_NAME) if isinstance(entries, dict) else None
    if not isinstance(charts, list) or not charts:
        raise ValueError("No Dynatrace Helm chart entries found")
    by_app = {}
    for entry in charts:
        if not isinstance(entry, dict):
            raise ValueError("Invalid Dynatrace Helm chart entry")
        app, chart = _stable_version(entry.get("appVersion")), _stable_version(entry.get("version"))
        if app is None or chart is None or entry.get("deprecated"):
            continue
        if app not in by_app or chart > by_app[app]:
            by_app[app] = chart
    if not by_app:
        raise ValueError("No stable Dynatrace Helm chart versions found")
    return by_app


def build_rows(recommendations, charts, existing):
    recorded = {row["version"] for row in existing}
    rows = []
    for app, chart in charts.items():
        version = ".".join(map(str, app))
        if version in recorded:
            continue
        kube = sorted(
            (kube for kube, rule in recommendations.items() if _matches(app, rule)),
            key=lambda value: tuple(map(int, value.split("."))), reverse=True,
        )
        if kube:
            rows.append(OrderedDict([
                ("version", version), ("kube", kube), ("requirements", []),
                ("incompatibilities", []), ("chart_version", ".".join(map(str, chart))),
            ]))
    # Resolve real charts first, then apply the repository's boundary/latest rule.
    # Including history here avoids rewriting on every run for redundant patches.
    retained = {row["version"] for row in reduce_versions(existing + rows)}
    return [row for row in rows if row["version"] in retained]


def _fetch(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def scrape():
    existing = read_yaml(TARGET_FILE)
    if not isinstance(existing, dict) or not isinstance(existing.get("versions"), list):
        print_error("Existing Dynatrace compatibility data is missing or invalid")
        return
    try:
        recommendations = parse_support_table(_fetch(SUPPORT_URL))
        charts = parse_helm_versions(_fetch(HELM_INDEX_URL))
        rows = build_rows(recommendations, charts, existing["versions"])
    except (requests.RequestException, ValueError, yaml.YAMLError) as exc:
        print_error(f"Cannot update Dynatrace compatibility: {exc}")
        return
    if rows:
        update_compatibility_info(TARGET_FILE, rows)
