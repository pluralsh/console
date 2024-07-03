import yaml
import requests

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


def write_yaml(file_path, data):
    try:
        with open(file_path, "w") as file:
            yaml.dump(data, file, default_flow_style=False, sort_keys=False)
            return True
    except Exception as e:
        print_error(f"Failed to write to {file_path}: {e}")
    return False


def update_chart_versions(app_name, chart_name=""):

    if not chart_name:
        chart_name = app_name

    yaml_file_name = f"../../static/compatibilities/{app_name}.yaml"
    compatibility_yaml = read_yaml(yaml_file_name)

    if not compatibility_yaml or "versions" not in compatibility_yaml:
        print_error(f"No versions found for {app_name}")
        return

    chart_url = compatibility_yaml["chart_url"]
    chart_index = fetch_page(chart_url + "/index.yaml")
    if not chart_index:
        print_error(f"Failed to fetch the index.yaml from {chart_url}")
        return

    index_yaml = yaml.safe_load(chart_index)
    if not index_yaml:
        print_error(f"Failed to parse the index.yaml for {app_name}")
        return

    chart_versions = index_yaml["entries"][chart_name]
    if not chart_versions:
        print_error(f"No versions found for {chart_name}")
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
        print_success("Updated chart versions for" + Fore.CYAN + f" {app_name}")
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


def update_compatibility_info(filepath, new_versions):
    for version in new_versions:
        version["kube"] = sorted(
            version["kube"], key=lambda v: Version(v), reverse=True
        )
    try:
        data = read_yaml(filepath)
        if data:
            update_versions_data(data, new_versions)
        else:
            print_warning("No existing versions found. Writing new data.")
            data = {"versions": sort_versions(new_versions)}
        if write_yaml(filepath, data):
            print_success(
                f"Updated compatibility info table: {Fore.CYAN}{filepath}"
            )
        else:
            print_error(f"Failed to update compatibility info for {filepath}")
    except Exception as e:
        print_error(f"Failed to update compatibility info: {e}")


# Custom YAML representer for lists that contain only strings
# This is to ensure that lists of strings are represented as flow style
#  e.g. [a, b, c]
def represent_kube_list(dumper, data):
    if isinstance(data, list) and all(isinstance(i, str) for i in data):
        return dumper.represent_sequence(
            "tag:yaml.org,2002:seq", data, flow_style=True
        )
    return dumper.represent_list(data)


# Add the custom representer to the yaml loader
yaml.add_representer(list, represent_kube_list)


# Custom YAML representer for OrderedDict
# This is to ensure that OrderedDict is represented as a map
# and in the order of insertion
def represent_ordereddict(dumper, data):
    return dumper.represent_mapping("tag:yaml.org,2002:map", data.items())


# Add the custom representer to the yaml loader
yaml.add_representer(OrderedDict, represent_ordereddict)
