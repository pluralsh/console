"""Scrape Crunchy Data's explicit, bounded Kubernetes support matrix."""

import re
from collections import OrderedDict
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

from utils import fetch_page, print_error, update_compatibility_info

APP_NAME = "crunchy-postgres-operator"
COMPATIBILITY_URL = (
    "https://access.crunchydata.com/documentation/postgres-operator/"
    "latest/overview/supported-platforms"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"
REGISTRY_URL = "https://registry.developers.crunchydata.com/v2/crunchydata/pgo"
AUTH_URL = "https://registry-auth.developers.crunchydata.com/auth"
REQUEST_TIMEOUT = 30


def parse_kube_versions(text: str) -> list[str]:
    """Expand only explicit minors and closed ranges, including ``1.32–36``.

    A minimum version or a '+' must never imply support for future Kubernetes
    releases. Cross-major ranges are rejected because minor counts are unknown.
    """
    versions = set()
    for part in text.split(","):
        match = re.fullmatch(
            r"\s*v?(\d+)\.(\d+)\s*"
            r"(?:[-–—]\s*v?(?:(\d+)\.)?(\d+)\s*)?",
            part,
        )
        if not match:
            raise ValueError(f"Unrecognized Kubernetes support range: {text!r}")

        major, first = int(match[1]), int(match[2])
        last_major = int(match[3]) if match[3] else major
        last = int(match[4]) if match[4] else first
        if major != last_major or last < first:
            raise ValueError(f"Invalid Kubernetes support range: {text!r}")

        versions.update(f"{major}.{minor}" for minor in range(first, last + 1))

    return sorted(versions, key=lambda v: tuple(map(int, v.split("."))), reverse=True)


def parse_page(content: bytes | str) -> list[OrderedDict]:
    soup = BeautifulSoup(content, "html.parser")
    series_headers = {
        "crunchy postgres for kubernetes series",
        "pgo series",
        "postgres operator series",
    }

    for table in soup.find_all("table"):
        header_row = table.find("tr")
        if header_row is None:
            continue
        headers = [
            cell.get_text(" ", strip=True).lower()
            for cell in header_row.find_all(["th", "td"])
        ]
        series_index = next(
            (i for i, label in enumerate(headers) if label in series_headers), None
        )
        kube_index = next(
            (i for i, label in enumerate(headers) if label in {
                "kubernetes version", "kubernetes versions"
            }),
            None,
        )
        if series_index is None or kube_index is None:
            continue

        versions = {}
        for row in table.find_all("tr")[1:]:
            cells = row.find_all(["th", "td"])
            if not cells:
                continue
            if len(cells) <= max(series_index, kube_index):
                raise ValueError("Incomplete Crunchy Postgres support matrix row")

            series = cells[series_index].get_text(" ", strip=True)
            match = re.fullmatch(r"v?(\d+)\.(\d+)\.[xX*]", series)
            if not match:
                raise ValueError(f"Unrecognized Crunchy Postgres series: {series!r}")

            # The source describes entire minor series, not particular patches.
            # Represent their lower bound as .0, following repository convention.
            # Do not infer an OCI chart version from a wildcard release series.
            version = f"{int(match[1])}.{int(match[2])}.0"
            kube_cell = cells[kube_index]
            for footnote in kube_cell.find_all("sup"):
                footnote.decompose()
            kube = parse_kube_versions(kube_cell.get_text(" ", strip=True))
            if version in versions and versions[version]["kube"] != kube:
                raise ValueError(f"Conflicting support rows for {version}")
            versions[version] = OrderedDict([
                ("version", version),
                ("kube", kube),
                ("requirements", []),
                ("incompatibilities", []),
            ])

        if versions:
            return sorted(
                versions.values(),
                key=lambda entry: tuple(map(int, entry["version"].split("."))),
                reverse=True,
            )

    return []


def registry_json(response: requests.Response) -> dict:
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Invalid Crunchy Postgres registry response")
    return payload


def fetch_chart_versions(versions: list[str]) -> dict[str, str]:
    """Verify exact series-boundary charts using the public OCI Helm metadata.

    The support matrix covers minor series. Keep the .0 lower-bound convention,
    but only attach a chart if its published version AND appVersion confirm that
    exact release. Never substitute a later patch or infer a chart from a tag.
    Older series without a public chart retain their compatibility information.
    """
    charts = {}
    with requests.Session() as session:
        # Public, anonymous pull access; do not use local credentials or netrc.
        session.trust_env = False
        response = session.get(AUTH_URL, params={
            "service": "docker-registry",
            "scope": "repository:crunchydata/pgo:pull",
        }, timeout=REQUEST_TIMEOUT)
        token = registry_json(response).get("token")
        if not isinstance(token, str) or not token:
            raise ValueError("Crunchy Postgres registry returned no anonymous pull token")
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.oci.image.manifest.v1+json",
        })

        # Discover published tags first. Removed historical releases can return
        # vendor-specific 404 errors; absence from this list is unambiguous.
        tags = set()
        page_url = f"{REGISTRY_URL}/tags/list"
        visited = set()
        while page_url:
            if (page_url in visited
                    or urlsplit(page_url)[:3] != urlsplit(f"{REGISTRY_URL}/tags/list")[:3]):
                raise ValueError("Invalid Crunchy Postgres registry pagination")
            visited.add(page_url)
            response = session.get(page_url, timeout=REQUEST_TIMEOUT)
            page = registry_json(response)
            page_tags = page.get("tags")
            if (page.get("name") != "crunchydata/pgo"
                    or not isinstance(page_tags, list)
                    or not all(isinstance(tag, str) for tag in page_tags)):
                raise ValueError("Invalid Crunchy Postgres registry tags")
            tags.update(page_tags)
            next_url = response.links.get("next", {}).get("url")
            page_url = urljoin(page_url, next_url) if next_url else None

        for version in versions:
            if version not in tags:
                continue
            response = session.get(f"{REGISTRY_URL}/manifests/{version}", timeout=REQUEST_TIMEOUT)
            config = registry_json(response).get("config", {})
            if not isinstance(config, dict):
                raise ValueError(f"Invalid Crunchy Postgres Helm config for {version}")
            digest = config.get("digest", "")
            if (config.get("mediaType") != "application/vnd.cncf.helm.config.v1+json"
                    or not isinstance(digest, str)
                    or not re.fullmatch(r"sha256:[0-9a-f]{64}", digest)):
                raise ValueError(f"Invalid Crunchy Postgres Helm manifest for {version}")

            response = session.get(
                f"{REGISTRY_URL}/blobs/{digest}", timeout=REQUEST_TIMEOUT
            )
            metadata = registry_json(response)
            if (metadata.get("name") != "pgo"
                    or metadata.get("version") != version
                    or metadata.get("appVersion") != version):
                raise ValueError(f"Crunchy Postgres chart does not match release {version}")
            charts[version] = metadata["version"]

    if not charts:
        raise ValueError("No verified Crunchy Postgres charts found")
    return charts


def scrape() -> None:
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        print_error("Failed to fetch Crunchy Postgres supported platforms")
        return

    try:
        versions = parse_page(content)
    except ValueError as error:
        print_error(f"Could not parse Crunchy Postgres support matrix: {error}")
        return
    if not versions:
        print_error("No Crunchy Postgres compatibility rows found")
        return

    try:
        charts = fetch_chart_versions([row["version"] for row in versions])
    except (requests.RequestException, ValueError) as error:
        print_error(f"Could not verify Crunchy Postgres charts: {error}")
        return
    for row in versions:
        if row["version"] in charts:
            row["chart_version"] = charts[row["version"]]

    update_compatibility_info(TARGET_FILE, versions)
