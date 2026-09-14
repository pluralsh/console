import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import (
    fetch_page,
    get_chart_versions,
    print_error,
    read_yaml,
    update_compatibility_info,
    validate_semver,
)

APP_NAME = "cloudnative-pg"
DOCS_BASE = "https://cloudnative-pg.io"
DOCS_ROOT = f"{DOCS_BASE}/docs"
SUPPORTED_PATH = "supported_releases"
RELEASE_DOCS = "https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def normalize_version(label: str) -> str | None:
    text = str(label).strip().lower()
    if not text or text == "main":
        return None
    # Only release families or stable versions; never turn an RC into a GA release.
    match = re.fullmatch(r"v?(\d+)\.(\d+)(?:\.(x|\d+))?", text)
    if not match:
        return None
    patch = match.group(3)
    version = f"{match.group(1)}.{match.group(2)}.{patch if patch and patch != 'x' else '0'}"
    semver = validate_semver(version)
    return str(semver) if semver else None


def normalize_kube_list(cell_text: str) -> list[str]:
    values: list[str] = []
    for part in str(cell_text).split(","):
        item = part.strip()
        match = re.fullmatch(r"v?(\d+)\.(\d+)", item)
        if not match:
            return []
        values.append(f"{match.group(1)}.{match.group(2)}")
    unique = sorted(
        set(values), key=lambda v: tuple(int(x) for x in v.split(".")), reverse=True
    )
    return unique


def get_current_docs_version() -> str | None:
    landing = fetch_page(f"{DOCS_ROOT}/")
    if not landing:
        return None
    html = landing.decode("utf-8", errors="replace")
    match = re.search(r"/docs/(\d+\.\d+)/", html)
    if match:
        return match.group(1)
    return None


def fetch_supported_page(path: str) -> bytes | None:
    url = f"{DOCS_ROOT}/{path}"
    return fetch_page(url)


def find_table(soup: BeautifulSoup, heading_id: str):
    heading = soup.find(["h2", "h3"], id=heading_id)
    if not heading:
        return None
    table = heading.find_next("table")
    if table and table.find_previous(["h2", "h3"]) is heading:
        return table
    return None


def cell_text(cell) -> str:
    # Docusaurus omits optional </th>/<td>/<tr> tags. html.parser nests those
    # elements, so get_text() would include all subsequent cells and rows.
    return " ".join(
        text.strip() for text in cell.find_all(string=True)
        if text.strip() and text.find_parent(["th", "td"]) is cell
    )


def parse_table_rows(table) -> list[OrderedDict]:
    if not table:
        return []

    headers = [cell_text(cell) for cell in table.find_all("th")]
    if "Supported Kubernetes versions" not in headers:
        raise ValueError("CloudNativePG table has no supported Kubernetes column")
    kube_index = headers.index("Supported Kubernetes versions")
    body = table.find("tbody")
    if not body:
        return []

    versions: list[OrderedDict] = []
    for row in body.find_all("tr"):
        cells = [cell_text(cell) for cell in row.find_all("td") if cell.find_parent("tr") is row]
        if not cells:
            continue

        version = normalize_version(cells[0])
        if not version:
            continue

        if len(cells) <= kube_index:
            raise ValueError(f"Incomplete CloudNativePG row for {version}")
        kube_versions = normalize_kube_list(cells[kube_index])
        if not kube_versions:
            raise ValueError(f"Invalid supported Kubernetes list for {version}")

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


def release_kube_versions(content: bytes, version: str) -> list[str]:
    """Read the release's own matrix, before later patches extend its support."""
    kube_index = None
    for line in content.decode("utf-8").splitlines():
        if not line.strip().startswith("|"):
            kube_index = None
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells[0] == "Version":
            kube_index = (
                cells.index("Supported Kubernetes versions")
                if "Supported Kubernetes versions" in cells else None
            )
        elif kube_index is not None and normalize_version(cells[0]) == version:
            if len(cells) <= kube_index:
                break
            kube = normalize_kube_list(cells[kube_index])
            if kube:
                return kube
            break
    raise ValueError(f"No valid release-tag support matrix for CloudNativePG {version}")


def scrape():
    current_version = get_current_docs_version()
    if not current_version:
        print_error("Could not discover the stable CloudNativePG documentation version.")
        return

    existing = read_yaml(TARGET_FILE)
    if not existing or not isinstance(existing.get("versions"), list):
        print_error("Could not read existing CloudNativePG compatibility versions.")
        return
    existing_versions = {entry["version"] for entry in existing["versions"]}

    parsed_versions: OrderedDict[str, OrderedDict] = OrderedDict()
    try:
        # Development docs may describe unreleased versions or override GA support.
        path = f"{current_version}/{SUPPORTED_PATH}/"
        content = fetch_supported_page(path)
        if not content:
            print_error(f"Failed to download CloudNativePG page: {path}")
            return

        soup = BeautifulSoup(content, "html.parser")
        supported_table = find_table(soup, "support-status-of-cloudnativepg-releases")
        old_table = find_table(soup, "old-releases")

        if not supported_table:
            raise ValueError("CloudNativePG supported release table not found")
        for entry in parse_table_rows(supported_table):
            parsed_versions[entry["version"]] = entry
        for entry in parse_table_rows(old_table):
            if entry["version"] not in parsed_versions:
                parsed_versions[entry["version"]] = entry
    except ValueError as error:
        print_error(str(error))
        return

    # Preserve recorded concrete releases: the moving .x table can gain support
    # in a later patch (for example 1.28.4), which must not be assigned to .0.
    versions = [entry for version, entry in parsed_versions.items() if version not in existing_versions]
    if not versions:
        return
    chart_versions = get_chart_versions(APP_NAME, chart_name="cloudnative-pg")
    if not chart_versions:
        print_error("No CloudNativePG chart versions found.")
        return
    released_versions = []
    try:
        for entry in versions:
            chart_version = chart_versions.get(entry["version"])
            if not chart_version or not validate_semver(chart_version):
                continue
            version = entry["version"]
            url = f"{RELEASE_DOCS}/v{version}/docs/src/supported_releases.md"
            content = fetch_page(url)
            if not content:
                raise ValueError(f"Could not fetch the release-tag matrix: {url}")
            entry["kube"] = release_kube_versions(content, version)
            entry["chart_version"] = chart_version
            released_versions.append(entry)
    except ValueError as error:
        print_error(str(error))
        return
    if released_versions:
        update_compatibility_info(TARGET_FILE, released_versions)
