import re
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    get_github_releases,
    expand_kube_versions,
    read_yaml,
    write_yaml,
)

app_name = "rook"
compatibility_url = "https://rook.io/docs/rook/latest/Getting-Started/quickstart/#kubernetes-version"
helm_repository_url = "https://charts.rook.io/release"


def get_rook_kube_compatibility(version):
    major_minor_version = ".".join(version.split(".")[:2])
    url = f"https://rook.io/docs/rook/v{major_minor_version}/Getting-Started/quickstart/"
    
    page_content = fetch_page(url)
    if not page_content:
        print_error(f"Could not fetch page for version {version} from {url}")
        return None

    soup = BeautifulSoup(page_content, "html.parser")
    
    kube_version_heading = soup.find("a", class_="headerlink", href="#kubernetes-version")
    
    if not kube_version_heading:
        kube_version_heading = soup.find(lambda tag: tag.name in ["h1", "h2", "h3", "h4", "h5", "h6"] and "Kubernetes Version" in tag.get_text())

    if not kube_version_heading:
        print_error(f"Could not find 'Kubernetes Version' heading for version {version} at url {url}")
        return None

    next_element = kube_version_heading.parent.find_next_sibling("p")
    
    if not next_element:
        print_error(f"Could not find compatibility info paragraph for version {version}")
        return None
        
    text = next_element.get_text()
    
    match = re.search(r"v(\d+\.\d+)\s+through\s+v(\d+\.\d+)", text)
    if match:
        min_v = match.group(1)
        max_v = match.group(2)
        return expand_kube_versions(min_v, max_v)
        
    match = re.search(r"v(\d+\.\d+)", text)
    if match:
        return [match.group(1)]

    print_error(f"Could not parse Kubernetes versions from text: '{text}'")
    return None


def scrape():
    versions = []
    releases = get_github_releases("rook", "rook")
    
    for release in releases:
        if not release.startswith("v"):
            continue
        
        ver = release.lstrip("v")
        version_parts = ver.split(".")
        if len(version_parts) < 3 or version_parts[2] != "0":
            continue

        kube_versions = get_rook_kube_compatibility(ver)
        if not kube_versions:
            continue

        version_info = OrderedDict(
            [
                ("version", ver),
                ("kube", kube_versions),
                ("chart_version", ver),
            ]
        )
        versions.append(version_info)
    
    if versions:
        update_compatibility_info(
            f"../../static/compatibilities/{app_name}.yaml", versions
        )

        yaml_file_name = f"../../static/compatibilities/{app_name}.yaml"
        data = read_yaml(yaml_file_name)
        if data:
            data['helm_repository_url'] = helm_repository_url
            write_yaml(yaml_file_name, data)
    else:
        print_error("No compatibility information found.")

    update_chart_versions(app_name, "rook-ceph")
