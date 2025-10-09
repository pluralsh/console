from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    get_chart_versions,
    expand_kube_versions,
    current_kube_version,
)

app_name = "velero"
compatibility_url = "https://github.com/vmware-tanzu/velero#velero-compatibility-matrix"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    tables = soup.find_all("table")
    return tables


def find_target_tables(tables):
    target_tables = []
    for table in tables:
        headers = table.find_all("th")
        if len(headers) >= 3:
            header_text = [th.get_text(strip=True) for th in headers]
            if "Velero version" in header_text and "Kubernetes" in " ".join(header_text):
                target_tables.append(table)
    return target_tables


def extract_table_data(target_tables, chart_versions):
    rows = []
    
    for table in target_tables:
        table_rows = table.find_all("tr")[1:]
        
        for row in table_rows:
            columns = row.find_all("td")
            if len(columns) >= 2:
                velero_version = columns[0].get_text(strip=True)
                kube_compatibility = columns[1].get_text(strip=True)
                
                if "-" in kube_compatibility:
                    start_version, end_version = kube_compatibility.split("-")
                    if end_version == "latest":
                        latest_version = current_kube_version()
                        kube_versions = expand_kube_versions(start_version, latest_version)
                    else:
                        kube_versions = expand_kube_versions(start_version, end_version)
                else:
                    kube_versions = [kube_compatibility]
                
                chart_version = None
                chart_version = chart_versions.get(velero_version)
                
                if not chart_version:
                    for cv_key, cv_value in chart_versions.items():
                        if cv_key.startswith(velero_version + "."):
                            chart_version = cv_value
                            break
                
                version_info = OrderedDict([
                    ("version", velero_version),
                    ("kube", kube_versions),
                    ("requirements", []),
                    ("incompatibilities", [])
                ])
                
                if chart_version:
                    version_info["chart_version"] = chart_version
                    
                rows.append(version_info)
    
    return rows


def scrape():
    page_content = fetch_page(compatibility_url)
    if not page_content:
        return

    tables = parse_page(page_content)
    target_tables = find_target_tables(tables)
    
    if target_tables:
        chart_versions = get_chart_versions(app_name)
        rows = extract_table_data(target_tables, chart_versions)
        if rows:
            update_compatibility_info(
                f"../../static/compatibilities/{app_name}.yaml", rows
            )
        else:
            print_error("No valid compatibility data extracted.")
    else:
        print_error("No compatibility information found.")
