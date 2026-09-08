"""Read Kured's documented expected (not certified/tested) compatibility.

Only explicit matrix releases with a published stable Helm chart are emitted.
The upstream matrix includes expected future Kubernetes minors; retain those
explicit values, without extending its ranges or inferring unlisted releases.
"""

import re
from urllib.request import urlopen

APP_NAME = "kured"
SOURCE_URL = "https://raw.githubusercontent.com/kubereboot/website/main/content/en/docs/installation.md"
INDEX_URL = "https://kubereboot.github.io/charts/index.yaml"
TARGET_FILE = "../../static/compatibilities/kured.yaml"
SEMVER = re.compile(r"v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")


def version_key(value):
    match = SEMVER.fullmatch(str(value))
    return tuple(map(int, match.groups())) if match else None


def parse_matrix(content):
    rows = {}
    in_table = False
    for line in content.splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells[0].lower() == "kured" and cells[-1].lower() == "expected kubernetes compatibility":
            if in_table or rows:
                raise ValueError("Multiple Kured compatibility tables")
            if len(cells) != 5:
                raise ValueError("Changed Kured table columns")
            in_table = True
            continue
        if not in_table:
            continue
        if not line.strip().startswith("|"):
            in_table = False
            continue
        if all(re.fullmatch(r":?-+:?", cell) for cell in cells):
            continue
        if len(cells) != 5 or version_key(cells[0]) is None:
            raise ValueError("Malformed Kured compatibility row")
        version = cells[0].removeprefix("v")
        if version in rows:
            raise ValueError(f"Duplicate Kured version: {version}")
        kube = []
        for token in cells[-1].split(","):
            match = re.fullmatch(r"(\d+)\.(\d+)\.x", token.strip())
            if not match:
                raise ValueError(f"Unexpected Kubernetes compatibility: {token}")
            kube.append(".".join(match.groups()))
        rows[version] = sorted(set(kube), key=lambda v: tuple(map(int, v.split("."))), reverse=True)
    if not rows:
        raise ValueError("No Kured compatibility matrix found")
    return rows


def build_versions(matrix, entries):
    if not isinstance(entries, list) or not entries:
        raise ValueError("Missing Kured Helm chart entries")
    charts = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Malformed Kured chart entry")
        app, chart = entry.get("appVersion"), entry.get("version")
        if version_key(app) is None or version_key(chart) is None:
            continue
        app, chart = str(app).removeprefix("v"), str(chart).removeprefix("v")
        if app not in charts or version_key(chart) > version_key(charts[app]):
            charts[app] = chart
    versions = [
        {"version": app, "kube": matrix[app], "requirements": [],
         "incompatibilities": [], "chart_version": charts[app]}
        for app in sorted(matrix, key=version_key, reverse=True) if app in charts
    ]
    if not versions:
        raise ValueError("No documented Kured releases have stable Helm charts")
    return versions


def fetch_text(url):
    with urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def scrape():
    import yaml
    from utils import update_compatibility_info

    matrix = parse_matrix(fetch_text(SOURCE_URL))
    index = yaml.safe_load(fetch_text(INDEX_URL))
    if not isinstance(index, dict) or not isinstance(index.get("entries"), dict):
        raise ValueError("Malformed Helm index")
    versions = build_versions(matrix, index["entries"].get(APP_NAME))
    # All fetching and validation finish before the existing writer is called.
    update_compatibility_info(TARGET_FILE, versions)
