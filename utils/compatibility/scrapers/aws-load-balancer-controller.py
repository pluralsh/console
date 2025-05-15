import re
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    current_kube_version,
    get_latest_github_release,
    expand_kube_versions,
)

app_name = "aws-load-balancer-controller"
compatibility_url = "https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/deploy/installation/"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    sections = soup.find_all("h2")
    return sections


def find_target_tables(sections):
    target_tables = []
    for section in sections:
        if "Supported Kubernetes versions" in section.text:
            section = section.find_next("ul")
            target_tables.append(section)
    return target_tables


def expand_versions(start, end):
    start_major, start_minor, start_patch = start.split(".")
    end_major, end_minor, end_patch = end.split(".")

    expanded_versions = []
    major = int(start_major)
    minor = int(start_minor)
    patch = int(start_patch)
    while (
        (major < int(end_major))
        or (major == int(end_major) and minor <= int(end_minor))
        or (
            major == int(end_major)
            and minor == int(end_minor)
            and patch <= int(end_patch)
        )
    ):
        expanded_versions.append(f"{major}.{minor}.{patch}")
        if (
            major == int(end_major)
            and minor == int(end_minor)
            and patch == int(end_patch)
        ):
            break
        if patch == 9:
            if minor == 9:
                major += 1
                minor = 0
            else:
                minor += 1
            patch = 0
        else:
            patch += 1
    return expanded_versions


def extract_versions(version_string):
    versions = []
    pattern = r"(\d+\.\d+\.\d+)"
    # Find all matches in the string
    matches = re.findall(pattern, version_string)

    start = matches[0]
    if len(matches) == 2:
        end = matches[1]
    else:
        end = get_latest_github_release(
            "kubernetes-sigs", "aws-load-balancer-controller"
        ).strip("v")

    versions = expand_versions(start, end)

    return versions


def extract_table_data(target_tables, chart_versions):
    versions = []
    for table in target_tables:
        rows = table.find_all("li")
        rows = [row.text for row in rows]
        for row in rows:
            app_versions = extract_versions(row)
            k8s_versions = row.split(" ")[-1]

            if "+" in k8s_versions:
                k8s_versions = expand_kube_versions(
                    k8s_versions.strip("+"), current_kube_version()
                )

            if "-" in k8s_versions:
                start = k8s_versions.split("-")[0]
                end = k8s_versions.split("-")[1]
                k8s_versions = expand_kube_versions(start, end)

            for ver in app_versions:
                chart_version = chart_versions.get(ver)
                if not chart_version:
                    continue

                version_info = OrderedDict(
                    [
                        ("version", ver),
                        ("kube", k8s_versions),
                        ("requirements", []),
                        ("incompatibilities", []),
                    ]
                )
                versions.append(version_info)

    return versions


def scrape():

    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    sections = parse_page(page_content)
    target_tables = find_target_tables(sections)
    chart_versions = get_chart_versions(app_name)
    if target_tables.__len__() >= 1:
        rows = extract_table_data(target_tables, chart_versions)
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", rows
        )
    else:
        print_error("No compatibility information found.")

