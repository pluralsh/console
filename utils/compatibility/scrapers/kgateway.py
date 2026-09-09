import re
from urllib.parse import urljoin

import requests
from packaging.version import Version

from utils import update_compatibility_info


APP_NAME = "kgateway"
VERSIONS_URL = "https://raw.githubusercontent.com/kgateway-dev/kgateway.dev/main/assets/kgw-docs/pages/reference/versions.md"
# cr.kgateway.dev is served by ghcr.io, which is what its auth challenge points at.
REGISTRY_URL = "https://ghcr.io/"
TOKEN_URL = "https://ghcr.io/token?scope=repository:kgateway-dev/charts/kgateway:pull&service=ghcr.io"
TAGS_URL = "https://ghcr.io/v2/kgateway-dev/charts/kgateway/tags/list?n=1000"
REQUEST_TIMEOUT = 30

FAMILY_RE = re.compile(r"^(\d+)\.(\d+)\.x$")
MINOR_RE = re.compile(r"^v?(\d+)\.(\d+)$")
RANGE_RE = re.compile(r"^v?(\d+\.\d+)\s*[-\u2013\u2014]\s*v?(\d+\.\d+)$")
NEXT_LINK_RE = re.compile(r'<([^>]+)>;\s*rel="next"')


def get(url, headers=None):
    response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response


def fetch_text(url):
    return get(url).content.decode("utf-8")


def _cells(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def _column(cells, name):
    matches = [i for i, cell in enumerate(cells) if cell.lower().startswith(name)]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one {name!r} column in the kgateway version table")
    return matches[0]


def _minor(value):
    match = MINOR_RE.fullmatch(value.strip())
    if not match:
        raise ValueError(f"Unexpected Kubernetes version: {value!r}")
    return int(match[1]), int(match[2])


def _kube_versions(cell):
    cell = cell.strip()
    match = RANGE_RE.fullmatch(cell)
    if match:
        low, high = _minor(match[1]), _minor(match[2])
    else:
        low = high = _minor(cell)
    if low[0] != high[0] or low > high:
        raise ValueError(f"Unexpected Kubernetes version range: {cell!r}")
    return [f"{low[0]}.{minor}" for minor in range(high[1], low[1] - 1, -1)]


def parse_versions_table(markdown):
    lines = [line for line in markdown.splitlines() if line.strip().startswith("|")]
    header = None
    families = {}
    for line in lines:
        cells = _cells(line)
        if header is None:
            if any(cell.lower().startswith("kgateway") for cell in cells):
                header = (_column(cells, "kgateway"), _column(cells, "kubernetes"))
            continue
        if all(set(cell) <= set("-: ") for cell in cells):
            continue
        if len(cells) <= max(header):
            raise ValueError(f"Malformed kgateway version table row: {line!r}")
        match = FAMILY_RE.fullmatch(cells[header[0]])
        if not match:
            raise ValueError(f"Unexpected kgateway release family: {cells[header[0]]!r}")
        family = f"{int(match[1])}.{int(match[2])}"
        if family in families:
            raise ValueError(f"Duplicate kgateway release family: {family}")
        families[family] = _kube_versions(cells[header[1]])
    if header is None or not families:
        raise ValueError("kgateway version table not found")
    return families


def chart_tags():
    token = get(TOKEN_URL).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    tags = []
    url = TAGS_URL
    while url:
        response = get(url, headers=headers)
        tags.extend(response.json().get("tags") or [])
        match = NEXT_LINK_RE.search(response.headers.get("Link", ""))
        url = urljoin(REGISTRY_URL, match[1]) if match else None
    if not tags:
        raise ValueError("kgateway chart registry returned no tags")
    return tags


def stable_chart_versions(tags):
    versions = {}
    for tag in tags:
        if not re.fullmatch(r"v?\d+\.\d+\.\d+", tag):
            continue
        version = str(Version(tag))
        # The v-prefixed tag is the one published for every release; the bare
        # tag only exists for newer releases, so prefer the prefixed form.
        if version not in versions or tag.startswith("v"):
            versions[version] = tag
    return versions


def build_rows(families, chart_versions):
    rows = []
    for version, tag in chart_versions.items():
        parsed = Version(version)
        kube = families.get(f"{parsed.major}.{parsed.minor}")
        if not kube:
            continue
        rows.append({
            "version": version,
            "kube": list(kube),
            "chart_version": tag,
            "requirements": [],
            "incompatibilities": [],
        })
    if not rows:
        raise ValueError("No kgateway chart release matches a documented release family")
    return sorted(rows, key=lambda row: Version(row["version"]), reverse=True)


def scrape():
    families = parse_versions_table(fetch_text(VERSIONS_URL))
    rows = build_rows(families, stable_chart_versions(chart_tags()))
    update_compatibility_info(f"../../static/compatibilities/{APP_NAME}.yaml", rows)
