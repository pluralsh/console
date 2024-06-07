import yaml
from collections import OrderedDict
from colorama import Fore, Style


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


def printError(message):
    print(Fore.RED + "💔 Error:" + Style.RESET_ALL + f" {message}")


def printSuccess(message):
    print(Fore.GREEN + "✅ Success:" + Style.RESET_ALL + f" {message}")


def printWarning(message):
    print(Fore.YELLOW + "⚠️ Warning:" + Style.RESET_ALL + f" {message}")


# Custom YAML representer for lists that contain only strings
# This is to ensure that lists of strings are represented as flow style e.g. [a, b, c]
def represent_kube_list(dumper, data):
    if isinstance(data, list) and all(isinstance(i, str) for i in data):
        return dumper.represent_sequence(
            "tag:yaml.org,2002:seq", data, flow_style=True
        )
    return dumper.represent_list(data)


# Add the custom representer to the yaml loader
yaml.add_representer(list, represent_kube_list)


# Custom YAML representer for OrderedDict
# This is to ensure that OrderedDict is represented as a map and in the order of insertion
def represent_ordereddict(dumper, data):
    return dumper.represent_mapping("tag:yaml.org,2002:map", data.items())


# Add the custom representer to the yaml loader
yaml.add_representer(OrderedDict, represent_ordereddict)


def write_compatibility_info(filepath, icon, git_url, release_url, versions):
    data = {
        "icon": icon,
        "git_url": git_url,
        "release_url": release_url,
        "versions": versions,
    }
    try:
        with open(filepath, "w") as file:
            yaml.dump(data, file, default_flow_style=False, sort_keys=False)
        printSuccess(
            "Compatibility info written to " + Fore.CYAN + f"{filepath}"
        )
    except Exception as e:
        printError(f"Failed to write compatibility info: {e}")
