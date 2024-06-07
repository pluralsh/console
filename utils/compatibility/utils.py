import yaml
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
