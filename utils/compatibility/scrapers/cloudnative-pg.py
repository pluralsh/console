import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "cloudnative-pg"
DOCS_BASE = "https://cloudnative-pg.io"
DOCS_ROOT = f"{DOCS_BASE}/docs"
SUPPORTED_PATH = "supported_releases"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def normalize_version(label: str) -> str | None:
    text = str(label).strip().lower()
    if not text or text == "main":
        return None
    text = text.lstrip("v")
    # Match major.minor components
    match = re.search(r"(\d+)\.(\d+)", text)
    if not match:
        return None
    version = f"{match.group(1)}.{match.group(2)}.0"
    semver = validate_semver(version)
    return str(semver) if semver else None


def normalize_kube_list(cell_text: str) -> list[str]:
    values: list[str] = []
    for part in str(cell_text).split(","):
        item = part.strip()
        if not item:
            continue
        match = re.search(r"(\d+)\.(\d+)", item)
        if not match:
            continue
        values.append(f"{match.group(1)}.{match.group(2)}")
    unique = sorted(
        set(values), key=lambda v: tuple(int(x) for x in v.split(".")), reverse=True
    )
    return unique


def get_current_docs_version() -> str:
    landing = fetch_page(f"{DOCS_ROOT}/")
    if not landing:
        return "devel"
    html = landing.decode("utf-8", errors="replace")
    match = re.search(r"/docs/(\d+\.\d+)/", html)
    if match:
        return match.group(1)
    return "devel"


def fetch_supported_page(path: str) -> bytes | None:
    url = f"{DOCS_ROOT}/{path}"
    return fetch_page(url)


def find_table(soup: BeautifulSoup, heading_id: str):
    heading = soup.find(["h2", "h3"], id=heading_id)
    if not heading:
        return None
    return heading.find_next("table")


def parse_table_rows(table, kube_index: int) -> list[OrderedDict]:
    if not table:
        return []

    body = table.find("tbody")
    if not body:
        return []

    versions: list[OrderedDict] = []
    for row in body.find_all("tr"):
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
        if len(cells) <= kube_index:
            continue

        version = normalize_version(cells[0])
        if not version:
            continue

        kube_versions = normalize_kube_list(cells[kube_index])
        if not kube_versions:
            continue

        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return versions


def scrape():
    current_version = get_current_docs_version()
    sources = [
        f"{current_version}/{SUPPORTED_PATH}",
        f"devel/{SUPPORTED_PATH}",
    ]

    parsed_versions: OrderedDict[str, OrderedDict] = OrderedDict()

    for path in sources:
        content = fetch_supported_page(path)
        if not content:
            print_error(f"Failed to download CloudNativePG page: {path}")
            continue

        soup = BeautifulSoup(content, "html.parser")
        supported_table = find_table(soup, "support-status-of-cloudnativepg-releases")
        old_table = find_table(soup, "old-releases")

        for entry in parse_table_rows(supported_table, 4):
            parsed_versions[entry["version"]] = entry
        for entry in parse_table_rows(old_table, 3):
            if entry["version"] not in parsed_versions:
                parsed_versions[entry["version"]] = entry

    versions = list(parsed_versions.values())
    if not versions:
        print_error("No CloudNativePG compatibility data extracted.")
        return

    chart_versions = get_chart_versions(APP_NAME, chart_name="cloudnative-pg")
    if chart_versions:
        for entry in versions:
            chart_version = chart_versions.get(entry["version"])
            if chart_version:
                entry["chart_version"] = chart_version

    update_compatibility_info(TARGET_FILE, versions)
