from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    current_kube_version,
    expand_kube_versions,
)
from collections import OrderedDict
import re

app_name = "coredns"
compatibility_url = (
    "https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/CoreDNS-k8s_version.md"
)
kubeadm_constants_url = (
    "https://raw.githubusercontent.com/kubernetes/kubernetes/"
    "v{version}.0/cmd/kubeadm/app/constants/constants.go"
)


def parse_markdown_table(markdown: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in markdown.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.strip("|").split("|")]
        if len(cols) < 2:
            continue
        header = cols[0].lower()
        if header.startswith("kubernetes version"):
            continue
        if re.fullmatch(r":?-+:?", cols[0]):
            continue
        rows.append((cols[0], cols[1]))
    return rows


def kube_version_key(version: str) -> tuple[int, int]:
    major, minor = version.split(".")
    return int(major), int(minor)


def expand_min_kube_versions(kubernetes_versions: str) -> list[str]:
    latest_kube_version = current_kube_version()
    if not latest_kube_version:
        print_error("Could not determine current Kubernetes version.")
        return []

    versions = set()
    for version in re.split(r"&|,", kubernetes_versions):
        minimum = re.sub(r"^v", "", version.strip())
        if not minimum:
            continue
        versions.update(expand_kube_versions(minimum, latest_kube_version))

    return sorted(versions, key=kube_version_key)


def extract_table_data(table_rows: list[tuple[str, str]], chart_versions):
    combined: dict[str, dict[str, object]] = {}
    for kube_cell, coredns_cell in table_rows:
        kubernetes_versions = kube_cell.strip()
        coredns_version = coredns_cell.strip()

        # Remove leading 'v' from CoreDNS version
        coredns_match = re.search(r"\d+\.\d+\.\d+", coredns_version)
        if coredns_match:
            coredns_version = coredns_match.group()
        else:
            print_error(
                f"Failed to parse CoreDNS version from {coredns_version}"
            )
            continue

        kubernetes_versions_list = expand_min_kube_versions(kubernetes_versions)
        if not kubernetes_versions_list:
            continue

        chart_version = chart_versions.get(coredns_version)
        if not chart_version:
            continue

        entry = combined.setdefault(
            coredns_version,
            {"kube": set(), "chart_version": chart_version},
        )
        entry["kube"].update(kubernetes_versions_list)

    rows: list[OrderedDict] = []
    for version, entry in combined.items():
        rows.append(
            OrderedDict(
                [
                    ("version", version),
                    ("kube", sorted(entry["kube"], key=kube_version_key)),
                    ("chart_version", entry["chart_version"]),
                    ("images", []),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        )
    return rows


def extract_new_kubeadm_versions(table_rows, chart_versions, latest_kube, fetcher):
    """Fill gaps after the upstream table using released kubeadm defaults.

    These are exact bundled-version associations. Unlike the legacy table
    processing above, do not extrapolate them to later Kubernetes releases.
    Only include application versions with a matching official Helm chart.
    """
    documented = []
    for kube_cell, _ in table_rows:
        for part in re.split(r"&|,", kube_cell):
            match = re.fullmatch(r"v?(\d+)\.(\d+)", part.strip())
            if not match:
                raise ValueError("Invalid Kubernetes version in CoreDNS table")
            documented.append(tuple(map(int, match.groups())))
    if not documented or not re.fullmatch(r"\d+\.\d+", latest_kube or ""):
        raise ValueError("Cannot determine Kubernetes releases missing from CoreDNS table")

    last_major, last_minor = max(documented)
    latest_major, latest_minor = kube_version_key(latest_kube)
    if latest_major != last_major:
        raise ValueError("Unsupported Kubernetes major version transition")

    combined = {}
    for minor in range(last_minor + 1, latest_minor + 1):
        kube_version = f"{last_major}.{minor}"
        content = fetcher(kubeadm_constants_url.format(version=kube_version))
        if not content:
            raise ValueError(f"Missing kubeadm constants for Kubernetes {kube_version}")
        source = content.decode("utf-8")
        matches = re.findall(
            r'^\s*CoreDNSVersion\s*=\s*"v?(\d+\.\d+\.\d+)"\s*(?://[^\n]*)?$',
            source,
            re.MULTILINE,
        )
        if len(matches) != 1:
            raise ValueError(f"Invalid CoreDNS version in Kubernetes {kube_version}")
        coredns_version = matches[0]
        chart_version = chart_versions.get(coredns_version)
        if not chart_version:
            continue
        entry = combined.setdefault(coredns_version, OrderedDict([
            ("version", coredns_version),
            ("kube", []),
            ("chart_version", chart_version),
            ("images", []),
            ("requirements", []),
            ("incompatibilities", []),
        ]))
        entry["kube"].append(kube_version)
    return list(combined.values())


def scrape():
    page_content = fetch_page(compatibility_url)
    if not page_content:
        print_error("Failed to fetch page content.")
        return

    markdown = page_content.decode("utf-8", errors="replace")
    table_rows = parse_markdown_table(markdown)
    if not table_rows:
        print_error("No tables found in the page content.")
        return

    chart_versions = get_chart_versions(app_name)
    rows = extract_table_data(table_rows, chart_versions)
    try:
        additional_rows = extract_new_kubeadm_versions(
            table_rows, chart_versions, current_kube_version(), fetch_page
        )
        # The writer replaces entries by app version. Preserve existing table
        # entries if a subsequent kubeadm release bundles the same CoreDNS.
        existing_versions = {row["version"] for row in rows}
        rows.extend(row for row in additional_rows if row["version"] not in existing_versions)
    except (ValueError, UnicodeError) as error:
        print_error(str(error))
        return
    if not rows:
        print_error("No compatibility information found.")
        return

    update_compatibility_info(
        f"../../static/compatibilities/{app_name}.yaml", rows
    )
