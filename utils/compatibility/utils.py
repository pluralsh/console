import yaml
import requests

from collections import OrderedDict
from colorama import Fore, Style
from packaging.version import Version


def printError(message):
    print(Fore.RED + "💔 Error:" + Style.RESET_ALL + f" {message}")


def printSuccess(message):
    print(Fore.GREEN + "✅ Success:" + Style.RESET_ALL + f" {message}")


def printWarning(message):
    print(Fore.YELLOW + "⚠️ Warning:" + Style.RESET_ALL + f" {message}")


def readYaml(file_path):
    try:
        with open(file_path, "r") as file:
            yaml_file = yaml.safe_load(file)
        return yaml_file
    except FileNotFoundError:
        printError(f"File not found at {file_path}")
    except yaml.YAMLError as exc:
        printError(f"Reading the YAML file: {exc}")
    except Exception as e:
        printError(f"{e}")
    return None


def fetch_page(url):
    response = requests.get(url)
    if response.status_code != 200:
        printError(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
        return None
    return response.content


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


def sort_versions(versions):
    return sorted(versions, key=lambda v: Version(v["version"]), reverse=True)


def sort_kube_versions(versions):
    return sorted(versions, key=lambda v: Version(v), reverse=True)


def update_compatibility_info(filepath, new_versions):
    for version in new_versions:
        version["kube"] = sort_kube_versions(version["kube"])
    try:
        data = readYaml(filepath)
        if data and "versions" in data:
            existing_versions = {v["version"]: v for v in data["versions"]}
            for new_version in new_versions:
                version_num = new_version["version"]
                if version_num not in existing_versions:
                    existing_versions[version_num] = new_version
            data["versions"] = sort_versions(list(existing_versions.values()))
            with open(filepath, "w") as file:
                yaml.dump(
                    data, file, default_flow_style=False, sort_keys=False
                )
            printSuccess(
                "Updated compatibility info in" + Fore.CYAN + f" {filepath}"
            )
        else:
            printWarning("No existing versions found. Writing new data.")
            with open(filepath, "w") as file:
                yaml.dump(
                    {"versions": sort_versions(new_versions)},
                    file,
                    default_flow_style=False,
                    sort_keys=False,
                )
            printSuccess(
                "Written new compatibility info to "
                + Fore.CYAN
                + f" {filepath}"
            )
    except Exception as e:
        printError(f"Failed to update compatibility info: {e}")
