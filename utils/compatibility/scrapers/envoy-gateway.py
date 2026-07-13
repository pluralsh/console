from __future__ import annotations

from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import fetch_page, print_error, update_compatibility_info


APP_NAME = "envoy-gateway"
COMPATIBILITY_URL = "https://gateway.envoyproxy.io/news/releases/matrix/"
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


def _decode(content):
    return content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content


def _clean_version(value: str) -> str:
    return value.strip().lstrip("v")


def _parse_kube_versions(value: str) -> list[str]:
    versions = []
    for raw_version in value.split(","):
        version = _clean_version(raw_version)
        if version:
            versions.append(version)
    return versions


def _find_compatibility_table(soup: BeautifulSoup):
    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        if "Envoy Gateway version" in headers and "Kubernetes version" in headers:
            return table, headers
    return None, []


def _requirement(label: str, value: str) -> str | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    return f"{label} {cleaned}"


def scrape():
    content = fetch_page(COMPATIBILITY_URL)
    if not content:
        print_error("Failed to fetch Envoy Gateway compatibility matrix.")
        return

    soup = BeautifulSoup(_decode(content), "html.parser")
    table, headers = _find_compatibility_table(soup)
    if not table:
        print_error("Envoy Gateway compatibility table not found.")
        return

    gateway_idx = headers.index("Envoy Gateway version")
    proxy_idx = headers.index("Envoy Proxy version")
    rate_limit_idx = headers.index("Rate Limit version")
    gateway_api_idx = headers.index("Gateway API version")
    kube_idx = headers.index("Kubernetes version")

    versions = []
    for row in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all("td")]
        if len(cells) <= max(gateway_idx, proxy_idx, rate_limit_idx, gateway_api_idx, kube_idx):
            continue

        version = _clean_version(cells[gateway_idx])
        if not version or version == "latest":
            continue

        kube_versions = _parse_kube_versions(cells[kube_idx])
        if not kube_versions:
            continue

        requirements = [
            requirement
            for requirement in [
                _requirement("Envoy Proxy", cells[proxy_idx]),
                _requirement("Rate Limit", cells[rate_limit_idx]),
                _requirement("Gateway API", cells[gateway_api_idx]),
            ]
            if requirement
        ]

        versions.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", kube_versions),
                    ("requirements", requirements),
                    ("incompatibilities", []),
                ]
            )
        )

    if not versions:
        print_error("No Envoy Gateway compatibility rows parsed.")
        return

    update_compatibility_info(TARGET_FILE, versions)
