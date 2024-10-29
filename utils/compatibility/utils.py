import yaml
import requests
import semantic_version

from collections import OrderedDict
from colorama import Fore, Style
from packaging.version import Version


def print_error(message):
    print(Fore.RED + "💔 Error:" + Style.RESET_ALL + f" {message}")


def print_success(message):
    print(Fore.GREEN + "✅ Success:" + Style.RESET_ALL + f" {message}")


def print_warning(message):
    print(Fore.YELLOW + "⚠️ Warning:" + Style.RESET_ALL + f" {message}")


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
        # Return False for invalid version strings
        return None


def latest_kube_version():
    url = (
        "https://storage.googleapis.com/kubernetes-release/release/stable.txt"
    )
    response = requests.get(url)
    if response.status_code == 200:
        # remove leading whitespaces and the hotfix version e.g. v1.30.2 -> v1.30
        latest = response.text.lstrip("v")
        latest = latest.split(".")
        latest = ".".join(latest[:2])
        latest = validate_semver(latest)

        if not latest:
            print_error(f"Invalid Latest K8s Version: {latest}")
            return latest

        print(f"Using Latest kube version: {latest}")
        # Write the value to "../../KUBE_VERSION"
        file_path = "../../KUBE_VERSION"
        try:
            with open(file_path, "w") as file:
                file.write(latest)
        except Exception as e:
            print_error(f"Failed to write to {file_path}: {e}")

        return latest
    else:
        print_error(
            f"Failed to fetch the latest kube version: {response.status_code}"
        )
        return None


def current_kube_version():
    # Read the current kube version from ../../KUBE_VERSION file
    try:
        with open("../../KUBE_VERSION", "r") as file:
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
        app_version = chart_entry["appVersion"]
        app_version = app_version.lstrip("v")

        chart_version = chart_entry["version"]
        chart_version = chart_version.lstrip("v")

        for row in compatibility_yaml["versions"]:
            if row["version"] == app_version:
                row["chart_version"] = chart_version

    if write_yaml(yaml_file_name, compatibility_yaml):
        print_success(
            "Updated chart versions for" + Fore.CYAN + f" {app_name}"
        )
    else:
        print_error(f"Failed to update chart versions for {app_name}")


def sort_versions(versions):
    return sorted(versions, key=lambda v: Version(v["version"]), reverse=True)


def merge_versions(existing_versions, new_versions):
    for new_version in new_versions:
        version_num = new_version["version"]
        if version_num not in existing_versions:
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


def update_compatibility_info(filepath, new_versions):
    try:
        data = read_yaml(filepath)
        if data:
            new_versions = [ensure_keys(v) for v in new_versions]
            update_versions_data(data, new_versions)
        else:
            print_warning("No existing versions found. Writing new data.")
            data = {
                "versions": sort_versions(
                    [ensure_keys(v) for v in new_versions]
                )
            }
        if write_yaml(filepath, data):
            print_success(
                f"Updated compatibility info table: {Fore.CYAN}{filepath}"
            )
        else:
            print_error(f"Failed to update compatibility info for {filepath}")
    except Exception as e:
        print_error(f"Failed to update compatibility info: {e}")
