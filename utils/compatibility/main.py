# main.py
import os
import importlib
from colorama import Fore, Style
from utils import read_yaml, write_yaml, print_error, print_warning, latest_kube_version


def call_scraper(scraper):
    try:
        scraper_module = importlib.import_module(f"scrapers.{scraper}")
        scraper_module.scrape()
    except ModuleNotFoundError:
        print_warning(f"No scraper found for {scraper}")
    except AttributeError:
        print_error(f"Error While Running the Scraper for {scraper}")
    except Exception as e:
        print_error(f"An unexpected error occurred: {e}")


manifestFile = "../../static/compatibilities/manifest.yaml"
latest_kube_version()

if not os.path.exists(manifestFile):
    print_error(f"Manifest file not found at {manifestFile}")
    exit()

manifest = read_yaml(manifestFile)
print()

if not manifest:
    print_error("Failed to read the manifest file.")
    exit()

if "names" not in manifest:
    print_error("No names found in the manifest file.")

for name in manifest["names"]:
    scraper = os.getenv("SCRAPER")
    if scraper and name not in scraper:
        continue

    print(
        Fore.BLUE
        + "Calling scraper for"
        + Fore.MAGENTA
        + f" {name}"
        + Style.RESET_ALL
    )
    call_scraper(name)
    print("\n")

addons = []
for name in manifest["names"]:
    addon = read_yaml(f"../../static/compatibilities/{name}.yaml")
    addon["name"] = name
    addons.append(addon)

write_yaml("../../static/compatibilities.yaml", {"addons": addons})
