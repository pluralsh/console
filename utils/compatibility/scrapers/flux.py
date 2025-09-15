from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    print_warning,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    expand_kube_versions,
    current_kube_version,
    sort_versions,
    read_yaml,
    write_yaml,
)
import urllib.parse

APP_NAME = "flux"
BASE_URL = "https://fluxcd.io/flux/installation/"
HELM_REPO_URL = "https://fluxcd-community.github.io/helm-charts"
CHART_NAME = "flux2"
 
def discover_versions(soup):
    versions = []
    for li in soup.select("li.nav-item.dropdown"):
        toggle = li.find("a", class_="dropdown-toggle")
        if not toggle or toggle.get_text(strip=True) != "Versions":
            continue
        for a in li.select("div.dropdown-menu a.dropdown-item"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if not href or not text.startswith("v") or "Release" in text:
                continue
            version = text.lstrip("v").strip()
            if version.count(".") == 0 and version.isdigit():
                version = f"{version}.0.0"
            elif version.count(".") == 1:
                major, minor = version.split(".")
                if major.isdigit() and minor.isdigit():
                    version = f"{major}.{minor}.0"
            url = urllib.parse.urljoin(BASE_URL, href)
            if "/installation/" not in url.lower():
                parsed = urllib.parse.urlparse(url)
                if parsed.path.strip("/") == "":
                    url = urllib.parse.urljoin(url, "flux/installation/")
                else:
                    url = url.rstrip("/") + "/installation/"
            versions.append({"version": version, "url": url})
        break
    return versions


def clean_version_text(text):
    return text.replace(">=", "").replace("and later", "").lstrip("v").rstrip(". ").strip()


def parse_kube_cell(cell_text):
    raw = cell_text.strip()
    lowered = raw.replace(">=", "").strip().lower()
    if "and later" in lowered:
        base = clean_version_text(lowered.replace("and later", ""))
        if not base:
            return []
        parts = base.split(".")
        base_two = f"{parts[0]}.{parts[1]}" if len(parts) > 1 else base
        try:
            return expand_kube_versions(base_two, current_kube_version())
        except Exception as e:
            print_warning(f"Could not expand versions from {base}: {e}")
            return [base]
    versions = [clean_version_text(v) for v in raw.split(",")]
    seen = set()
    return [v for v in versions if v and not (v in seen or seen.add(v))]


def extract_versions(table, flux_version):
    headers = [th.get_text().lower().strip() for th in table.find_all("th")]
    kube_idx = next((i for i, h in enumerate(headers) if "kubernetes version" in h), -1)
    flux_idx = next((i for i, h in enumerate(headers) if "flux version" in h), -1)
    if kube_idx == -1:
        print_warning(f"Missing 'Kubernetes Version' column for Flux {flux_version}")
        return []
    if flux_idx == -1:
        flux_idx = 0
    kube_versions = []
    for row in table.find_all("tr")[1:]:
        cells = row.find_all("td")
        if len(cells) <= max(kube_idx, flux_idx):
            continue
        row_flux = clean_version_text(cells[flux_idx].get_text().strip())
        if flux_idx > 0 and row_flux != flux_version:
            continue
        kube_versions.extend(parse_kube_cell(cells[kube_idx].get_text().strip()))
    seen = set()
    kube_versions = [v for v in kube_versions if v and not (v in seen or seen.add(v))]
    if not kube_versions:
        return []
    return [OrderedDict([
        ("version", flux_version), ("kube", kube_versions),
        ("requirements", []), ("incompatibilities", []),
    ])]


def scrape():
    content = fetch_page(BASE_URL)
    if not content:
        return
    versions = discover_versions(BeautifulSoup(content, "html.parser"))
    if not versions:
        print_error("No Flux versions found.")
        return
    version_map = {}
    for info in versions:
        version = info["version"]
        url = info["url"]
        vcontent = fetch_page(url)
        if not vcontent:
            print_warning(f"Could not fetch {url}")
            continue
        vsoup = BeautifulSoup(vcontent, "html.parser")
        table = None
        for t in vsoup.find_all("table"):
            headers = [th.get_text().lower() for th in t.find_all("th")]
            if any("kubernetes version" in h for h in headers):
                table = t
                break
        if not table:
            print_warning(f"No compatibility table found for Flux {version} at {url}")
            continue
        rows = extract_versions(table, version)
        if not rows:
            print_warning(f"No data for Flux {version} at {url}")
            continue
        data = rows[0]
        if version in version_map:
            existing = version_map[version].get("kube", [])
            new = data.get("kube", [])
            seen = set()
            version_map[version]["kube"] = [k for k in existing + new if not (k in seen or seen.add(k))]
        else:
            version_map[version] = data
    if not version_map: print_error("No compatibility information found across all versions."); return
    rows_out = sort_versions(list(version_map.values()))
    out_path = f"../../static/compatibilities/{APP_NAME}.yaml"
    update_compatibility_info(out_path, rows_out)
    yaml_data = read_yaml(out_path)
    if yaml_data is not None:
        yaml_data["helm_repository_url"] = HELM_REPO_URL
        write_yaml(out_path, yaml_data)
    update_chart_versions(APP_NAME, chart_name=CHART_NAME)
