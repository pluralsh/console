"""Scrape Crunchy Data's explicit, bounded Kubernetes support matrix."""

import re
from collections import OrderedDict

from bs4 import BeautifulSoup

from utils import fetch_page, print_error, update_compatibility_info

APP_NAME = "crunchy-postgres-operator"
COMPATIBILITY_URL = (
    "https://access.crunchydata.com/documentation/postgres-operator/"
    "latest/overview/supported-platforms"
)
TARGET_FILE = f"../../static/compatibilities/{APP_NAME}.yaml"


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

        return sorted(
            versions.values(),
            key=lambda entry: tuple(map(int, entry["version"].split("."))),
            reverse=True,
        )

    return []


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

    update_compatibility_info(TARGET_FILE, versions)
