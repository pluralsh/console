import re
import yaml
import requests
import semantic_version
import subprocess
import traceback


from functools import lru_cache
from collections import OrderedDict
from colorama import Fore, Style
from packaging.version import Version
from datetime import datetime
from summarizer import helm_summary
from typing import Any, List, Set

KUBE_VERSION_FILE = "../../KUBE_VERSION"


def print_error(message):
    print(Fore.RED + "💔" + Style.RESET_ALL + f" {message}")


def print_success(message):
    print(Fore.GREEN + "✅" + Style.RESET_ALL + f" {message}")


def print_warning(message):
    print(Fore.YELLOW + "⛔️" + Style.RESET_ALL + f" {message}")

@lru_cache(maxsize=None)
def fetch_page(url):
    response = requests.get(url)
    if response.status_code != 200:
        print_error(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
        return None
    return response.content


def read_yaml(file_path):
    try:
        with open(file_path, "r") as file:
            yaml_file = yaml.safe_load(file)
        return yaml_file
    except FileNotFoundError:
        print_error(f"File not found at {file_path}")
    except yaml.YAMLError as exc:
        print_error(f"Reading the YAML file: {exc}")
    except Exception as e:
        print_error(f"{e}")
    return None


# Custom representer for lists containing only strings
def represent_kube_list(dumper, data):
    if isinstance(data, list) and all(isinstance(i, str) for i in data):
        return dumper.represent_sequence(
            "tag:yaml.org,2002:seq", data, flow_style=True
        )
    return dumper.represent_list(data)


# Custom representer for OrderedDict
def represent_ordereddict(dumper, data):
    return dumper.represent_mapping("tag:yaml.org,2002:map", data.items())


# Register custom representers to the YAML Dumper
yaml.add_representer(list, represent_kube_list)
yaml.add_representer(OrderedDict, represent_ordereddict)


def write_yaml(file_path, data):
    try:
        with open(file_path, "w") as file:
            yaml.dump(data, file, default_flow_style=False, sort_keys=False)
            return True
    except Exception as e:
        print_error(f"Failed to write to {file_path}: {e}")
    return False


def validate_semver(version_str):
    try:
        # Coerce the version string to handle versions like "1.30", "1.27", or "1.2.3"
        version = semantic_version.Version.coerce(version_str)

        # Check if prerelease and build are empty
        if version.prerelease or version.build:
            return None

        return version
    except ValueError:
        # Return None for invalid version strings
        return None


def latest_kube_version():
    url = (
        "https://cdn.dl.k8s.io/release/stable.txt"
    )
    response = requests.get(url)
    if response.status_code == 200:
        latest = response.text.lstrip("v")
        latest = validate_semver(latest)

        if not latest:
            print_error(f"Invalid Latest K8s Version: {latest}")
            return latest

        print(f"Using Latest kube version: {latest}")
        try:  # write latest version to KUBE_VERSION_FILE
            with open(KUBE_VERSION_FILE, "w") as file:
                file.write(f"{latest.major}.{latest.minor}")
        except Exception as e:
            print_error(f"Failed to write to {KUBE_VERSION_FILE}: {e}")

        return latest
    else:
        print_error(
            f"Failed to fetch the latest kube version: {response.status_code}"
        )
        return None


def current_kube_version():
    # Read the current kube version from KUBE_VERSION_FILE
    try:
        with open(KUBE_VERSION_FILE, "r") as file:
            return file.read().strip()
    except FileNotFoundError:
        print_error("KUBE_VERSION file not found")
        return None
    except Exception as e:
        print_error(f"Failed to read KUBE_VERSION file: {e}")
        return None


def expand_kube_versions(start, end):
    start_major, start_minor = start.split(".")
    end_major, end_minor = end.split(".")

    expanded_versions = [start]
    major = int(start_major)
    minor = int(start_minor)

    while (
        (major < int(end_major))
        or (major == int(end_major) and minor <= int(end_minor))
        or (major == int(end_major) and minor == int(end_minor))
    ):
        minor += 1
        expanded_versions.append(f"{major}.{minor}")
        if major == int(end_major) and minor == int(end_minor):
            break

    return expanded_versions

IMPORTED_REPOS = set()

def get_chart_images(url, chart, version, values=None):
    """
    Template a Helm chart for a given repo URL and chart name.
    Returns the Helm chart YAML or None if not found.
    This assumes the chart is available via a Helm repository.
    """
    # Add repo with a temp name
    oci_repo = url.startswith("oci://")
    if (chart, url) not in IMPORTED_REPOS and not oci_repo:
        subprocess.run(["helm", "repo", "add", chart, url, "--force-update"], check=True)
        subprocess.run(["helm", "repo", "update"], check=True)
        IMPORTED_REPOS.add((chart, url))
    cmd = ["helm", "template", f"{chart}/{chart}", "--version", version, "--kube-version", current_kube_version()]
    if oci_repo:
        cmd = ["helm", "template", chart, url, "--version", version, "--kube-version", current_kube_version()]

    if values:
        cmd.append("--set")
        cmd.append(values)
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print_error(f"Failed to template helm chart: {result.stderr}")
        return None

    objects = list(yaml.safe_load_all(result.stdout))
    return sorted(list(set(find_nested_images(objects))))

_IMAGE_RE = re.compile(
    r"""
    ^
    (?:[a-z0-9.-]+(?::\d+)?/)?  # optional registry (with optional port)
    [a-z0-9._\-/]+(:[A-Za-z0-9._-]+)?(@sha256:[a-f0-9]{64})?
    $
    """,
    re.IGNORECASE | re.VERBOSE,
    )

def _looks_like_image(s: str) -> bool:
    s = s.strip()
    # Fast rejects for common false positives
    if not s or " " in s or s.startswith(("-", "_")):
        return False
    return bool(_IMAGE_RE.match(s))

def find_nested_images(objs: Any) -> List[str]:
    """
    Recursively walk nested dict/list structures and extract container image references.

    Important behavior:
    - Traverses dict VALUES only (not keys), to avoid collecting component names.
    - Only returns strings that look like real image references (repo/name:tag or @sha256 digest).
    """
    images: Set[str] = set()

    def walk(x: Any) -> None:
        if x is None:
            return

        if isinstance(x, dict):
            for k, v in x.items():
                if k == "image":
                    images.add(v)
                    continue
                walk(v)

        if isinstance(x, (list, tuple, set)):
            for item in x:
                walk(item)

        # ignore other scalar types (int/bool/float/etc.)

    walk(objs)
    return sorted(images)
    

def get_github_releases(repo_owner, repo_name):
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases"
    response = requests.get(url)

    if response.status_code == 200:
        releases = []
        releases_json = response.json()
        for release in releases_json:
            releases.append(release["tag_name"])
        return releases
    else:
        raise Exception(
            f"Failed to fetch latest releases: {response.status_code}"
        )

@lru_cache(maxsize=None)
def get_kube_release_info():
    seen = set()
    result = []
    for kube_release in reversed(list(get_github_releases_timestamps("kubernetes", "kubernetes"))):
        if "-" in kube_release[0]:
            continue
        cleaned = clean_kube_version(kube_release[0])
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(kube_release)

    def sorter(tupe):
        validated = validate_semver(tupe[0].lstrip("v"))
        return (validated.major, validated.minor, validated.patch, tupe[1])

    return sorted(result, key=sorter, reverse=False)

def get_github_releases_timestamps(repo_owner, repo_name):
    for page in range(1, 3):
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases"
        response = requests.get(url, params={"page": page, "per_page": 100})
        if response.status_code == 200:
            releases = response.json()
            for release in releases:
                created_at = release.get("created_at")
                if not created_at:
                    continue
                print(created_at)
                # created_at = created_at.replace("Z", "+00:00")
                yield (release["tag_name"], datetime.fromisoformat(created_at))
        else:
            return

def find_last_n_releases(releases, ts, n=3):
    for i in range(len(releases)):
        if releases[i][1] > ts:
            if i == 0:
                return releases[0:n]
            return releases[max(0, i-n):i]
    return releases[-n:]


def get_latest_github_release(repo_owner, repo_name):
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases/latest"
    response = requests.get(url)

    if response.status_code == 200:
        latest_release = response.json()
        return latest_release.get("tag_name")
    else:
        raise Exception(
            f"Failed to fetch latest release: {response.status_code}"
        )


def get_chart_versions(app_name: str, chart_name: str = "") -> dict[str, str]:
    map_versions = {}

    if not chart_name:
        chart_name = app_name

    yaml_file_name = f"../../static/compatibilities/{app_name}.yaml"
    try:
        compatibility_yaml = read_yaml(yaml_file_name)
    except Exception as e:
        print_error(f"Error reading YAML file '{yaml_file_name}': {e}")
        return map_versions

    if not compatibility_yaml or "versions" not in compatibility_yaml:
        print_error(f"No versions found for {app_name} in the compatibility YAML file.")
        return map_versions

    helm_repository_url = compatibility_yaml.get("helm_repository_url")
    if compatibility_yaml.get('chart_name'):
        chart_name = compatibility_yaml.get('chart_name')
    if not helm_repository_url:
        print_error(f"'helm_repository_url' is missing in {yaml_file_name}.")
        return map_versions

    try:
        chart_index_content = fetch_page(helm_repository_url + "/index.yaml")
        if not chart_index_content:
            raise ValueError("Empty response")
        index_yaml = yaml.safe_load(chart_index_content)
    except Exception as e:
        print_error(f"Failed to fetch or parse index.yaml from {helm_repository_url}: {e}")
        return map_versions

    entries = index_yaml.get("entries", {})
    chart_versions = entries.get(chart_name)
    if not chart_versions:
        print_error(f"No chart versions found for {chart_name} in index.yaml.")
        return map_versions

    for chart_entry in chart_versions:
        app_version = chart_entry.get("appVersion", "").lstrip("v")
        chart_version = chart_entry.get("version", "").lstrip("v")
        if not map_versions.get(app_version):
            map_versions[app_version] = chart_version

    return map_versions


def update_chart_versions(app_name, chart_name=""):

    if not chart_name:
        chart_name = app_name

    yaml_file_name = f"../../static/compatibilities/{app_name}.yaml"
    compatibility_yaml = read_yaml(yaml_file_name)

    if not compatibility_yaml or "versions" not in compatibility_yaml:
        print_error(
            f"No versions found for {app_name} in the compatibility yaml file"
        )
        return

    helm_repository_url = compatibility_yaml["helm_repository_url"]
    chart_index = fetch_page(helm_repository_url + "/index.yaml")
    if not chart_index:
        print_error(
            f"Failed to fetch the index.yaml from {helm_repository_url}"
        )
        return

    index_yaml = yaml.safe_load(chart_index)
    if not index_yaml:
        print_error(f"Failed to parse the index.yaml for {app_name}")
        return

    chart_versions = index_yaml["entries"][chart_name]
    if not chart_versions:
        print_error(f"No Chart versions found for {chart_name}")
        return
    for chart_entry in chart_versions:
        app_version = chart_entry.get("appVersion", "").lstrip("v")
        chart_version = chart_entry.get("version", "").lstrip("v")
        for row in compatibility_yaml["versions"]:
            if row["version"] == app_version and not row.get("chart_version"):
                row["chart_version"] = chart_version
                break


    if write_yaml(yaml_file_name, compatibility_yaml):
        print_success(
            "Updated chart versions for" + Fore.CYAN + f" {app_name}"
        )
    else:
        print_error(f"Failed to update chart versions for {app_name}")


def sort_versions(versions):
    # Ensure all versions are strings before sorting
    for v in versions:
        v["version"] = str(v["version"])
        if v.get("chart_version"):
            v["chart_version"] = str(v["chart_version"])
    return sorted(versions, key=lambda v: (Version(v["version"]), Version(v["chart_version"]) if v.get("chart_version") else None), reverse=True)


def merge_versions(existing_versions, new_versions):
    for new_version in new_versions:
        version_num = new_version["version"]
        if existing_versions.get(version_num):
            new_version["summary"] = existing_versions[version_num].get("summary")
        existing_versions[version_num] = new_version
    return existing_versions


def update_versions_data(data, new_versions):
    existing_versions = {v["version"]: v for v in data.get("versions", [])}
    merged_versions = merge_versions(existing_versions, new_versions)
    data["versions"] = sort_versions(list(merged_versions.values()))


def ensure_keys(version):
    if "kube" in version:
        version["kube"] = sorted(
            version["kube"], key=lambda v: Version(v), reverse=True
        )
    if "requirements" not in version:
        version["requirements"] = []
    if "incompatibilities" not in version:
        version["incompatibilities"] = []
    return version


def reduce_versions(versions):
    reduced_versions = []
    cur_major = ""
    cur_minor = ""
    cur_kube = []

    # Sort versions to ensure the latest version is last
    versions = sort_versions(versions)

    for i, data in reversed(list(enumerate(versions))):
        version = validate_semver(data["version"])
        kube = data["kube"]

        if version and (
            cur_major != version.major      # add to reduced_versions if it's a new major version
            or cur_minor != version.minor   # or if it's a new minor version
            or cur_kube != set(kube)        # or if kube list changed
            or i == 0                       # or if it's the latest version
        ):
            cur_major = version.major
            cur_minor = version.minor
            cur_kube = set(kube)

            version_info = OrderedDict(
                [
                    ("version", str(version)),
                    ("kube", kube),
                    ("requirements", data.get("requirements", [])),
                    ("incompatibilities", data.get("incompatibilities", [])),
                    ("summary", data.get("summary")),
                ]
            )

            # Include chart_version if it exists in the original data
            if "chart_version" in data:
                version_info["chart_version"] = data["chart_version"]
                version_info["images"] = data.get("images", [])

            reduced_versions.append(version_info)

    return list(reversed(reduced_versions))


def clean_kube_version(vsn):
    vsn = vsn.lstrip("v")
    as_semver = validate_semver(vsn)
    if not as_semver:
        return None
    return f"{as_semver.major}.{as_semver.minor}"

def update_compatibility_info(filepath, new_versions):
    app_name = filepath.split("/")[-1].split(".")[0]
    try:
        data = read_yaml(filepath)
        if data:
            new_versions = [ensure_keys(v) for v in new_versions]
            update_versions_data(data, new_versions)
            
            data["versions"] = reduce_versions(data["versions"])

            if data.get('helm_repository_url'):
                url = data.get('helm_repository_url')
                for version in data["versions"]:
                    if "chart_version" in version:
                        print(f"Updating images for {app_name} {version['version']}")
                        imgs = get_chart_images(url, data.get('chart_name', app_name), version["chart_version"], data.get('helm_values'))
                        if imgs:
                            version["images"] = imgs
        else:
            print_warning("No existing versions found. Writing new data.")
            data = {
                "versions": sort_versions(
                    [ensure_keys(v) for v in new_versions]
                )
            }
        
        for i in range(len(data["versions"]) - 1):
            to_vsn = data["versions"][i] # in reverse order
            from_vsn = data["versions"][i+1]
            if to_vsn.get('summary'):
                continue

            print(f"summarizing application updates for {app_name} from {from_vsn['version']} to {to_vsn['version']}")
            summary = helm_summary(app_name, data, from_vsn, to_vsn)
            if summary:
                data["versions"][i]["summary"] = summary
        
        if write_yaml(filepath, data):
            print_success(
                f"Updated compatibility info table: {Fore.CYAN}{filepath}"
            )
        else:
            print_error(f"Failed to update compatibility info for {filepath}")
    except Exception as e:
        traceback.print_exc()


def fetch_eol_data(slug):
    """Fetch EOL data for a product from endoflife.date API."""
    if not slug:
        return None
    url = f"https://endoflife.date/api/{slug}.json"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return None
    except Exception as e:
        return None


def match_version_to_eol_cycle(version_str, eol_cycles):
    """
    Match an addon version to an EOL cycle.
    Tries exact match first, then prefix matching (e.g., "1.19.0" matches "1.19")
    """
    if not eol_cycles or not version_str:
        return None
    
    version = version_str.lstrip('v')
    
    for cycle in eol_cycles:
        cycle_name = cycle.get('cycle', '')
        if cycle_name == version:
            eol_date = cycle.get('eol')
            if eol_date:
                return eol_date
    
    version_parts = version.split('.')
    if len(version_parts) >= 2:
        major_minor = f"{version_parts[0]}.{version_parts[1]}"
        for cycle in eol_cycles:
            cycle_name = cycle.get('cycle', '')
            if cycle_name == major_minor:
                eol_date = cycle.get('eol')
                if eol_date:
                    return eol_date
    
    return None


def enrich_addon_with_eol(addon_dict, slug_map):
    """
    Enrich all versions in an addon dict with EOL data.
    Fetches EOL data once per addon, then matches all versions.
    """
    addon_name = addon_dict.get('name')
    if not addon_name:
        return addon_dict
    
    versions = addon_dict.get('versions', [])
    if not versions:
        return addon_dict
    
    slug = slug_map.get(addon_name)
    if not slug:
        return addon_dict
    
    eol_cycles = fetch_eol_data(slug)
    if not eol_cycles:
        return addon_dict
    
    enriched_count = 0
    for version in versions:
        version_str = version.get('version')
        if version_str:
            eol_date = match_version_to_eol_cycle(version_str, eol_cycles)
            if eol_date:
                version['eolAt'] = eol_date
                enriched_count += 1
    
    return addon_dict
