import re

from bs4 import BeautifulSoup
import yaml

from utils import fetch_page, print_error, read_yaml, update_compatibility_info


app_name = "couchbase-operator"
filepath = f"../../static/compatibilities/{app_name}.yaml"
docs_url = "https://docs.couchbase.com/operator"
page_name = "prerequisite-and-setup.html"
helm_repository_url = "https://couchbase-partners.github.io/helm-charts"


def stable_version(value):
    text = str(value).strip().removeprefix("v")
    if not re.fullmatch(r"\d+\.\d+\.\d+", text):
        return None
    return tuple(int(part) for part in text.split("."))


def documented_versions(content):
    soup = BeautifulSoup(content, "html.parser")
    selector = soup.select_one('select[data-component="operator"]')
    if selector is None:
        raise ValueError("Couchbase documentation version selector not found")
    versions = {
        option.get("value", "") for option in selector.find_all("option")
        if re.fullmatch(r"\d+\.\d+", option.get("value", ""))
    }
    if not versions:
        raise ValueError("No released Couchbase documentation versions found")
    return versions


def latest_charts(content, doc_versions):
    """Select actual stable appVersion/chart pairs, regardless of index order."""
    index = yaml.safe_load(content)
    entries = index.get("entries", {}).get(app_name, [])
    selected = {}
    for entry in entries:
        app = stable_version(entry.get("appVersion", ""))
        chart = stable_version(entry.get("version", ""))
        if app is None or chart is None or entry.get("deprecated", False):
            continue
        minor = f"{app[0]}.{app[1]}"
        if minor in doc_versions and (minor not in selected or (app, chart) > selected[minor]):
            selected[minor] = (app, chart)
    if not selected:
        raise ValueError("No stable Couchbase charts match the documented releases")
    return {
        minor: (".".join(map(str, app)), ".".join(map(str, chart)))
        for minor, (app, chart) in sorted(selected.items(), key=lambda item: item[1], reverse=True)
    }


def kubernetes_versions(content, minor):
    soup = BeautifulSoup(content, "html.parser")
    selected = soup.select_one('select[data-component="operator"] option[selected]')
    # Versioned URLs may redirect to current when old documentation is removed.
    if selected is None or selected.get("value") != minor:
        raise ValueError(f"Couchbase documentation does not identify release {minor}")
    table = soup.find("table", id="table-operator-compatibility")
    if table is None:
        raise ValueError(f"Couchbase {minor} Kubernetes compatibility table not found")
    headers = [cell.get_text(" ", strip=True) for cell in table.find_all("th")]
    if headers != ["Platform", "Version"]:
        raise ValueError(f"Unexpected Couchbase {minor} compatibility table headers")
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells or cells[0].get_text(" ", strip=True) != "Open Source Kubernetes":
            continue
        if len(cells) != 2:
            break
        match = re.fullmatch(r"1\.(\d+)\s*[-–—]\s*1\.(\d+)", cells[1].get_text(" ", strip=True))
        if match:
            first, last = map(int, match.groups())
            if first <= last:
                return [f"1.{version}" for version in range(last, first - 1, -1)]
        break
    raise ValueError(f"No explicit Kubernetes version range for Couchbase {minor}")


def scrape():
    existing = read_yaml(filepath)
    if not existing or not isinstance(existing.get("versions"), list):
        print_error("Could not read Couchbase compatibility data")
        return
    recorded = {str(entry["version"]): entry for entry in existing["versions"]}
    try:
        landing = fetch_page(f"{docs_url}/current/{page_name}")
        index = fetch_page(f"{helm_repository_url}/index.yaml")
        if not landing or not index:
            raise ValueError("Could not fetch Couchbase documentation or Helm index")
        charts = latest_charts(index, documented_versions(landing))
        versions = []
        for minor, (version, chart_version) in charts.items():
            # Moving release-family docs can gain support over time. Only add the
            # latest concrete patch, retaining previously recorded release history.
            if version in recorded:
                previous = recorded[version]
                previous_chart = stable_version(previous.get("chart_version", ""))
                if previous_chart is None or stable_version(chart_version) > previous_chart:
                    versions.append({**previous, "chart_version": chart_version, "images": []})
                continue
            content = fetch_page(f"{docs_url}/{minor}/{page_name}")
            if not content:
                raise ValueError(f"Could not fetch Couchbase {minor} documentation")
            versions.append({
                "version": version,
                "kube": kubernetes_versions(content, minor),
                "chart_version": chart_version,
                "requirements": [],
                "incompatibilities": [],
            })
    except (ValueError, TypeError, AttributeError, yaml.YAMLError) as error:
        print_error(str(error))
        return
    if versions:
        update_compatibility_info(filepath, versions)
