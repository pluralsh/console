# main.py
import os
import importlib
from utils import readYaml, printError, printWarning
from colorama import Fore, Style


def call_scraper(scraper):
    try:
        scraper_module = importlib.import_module(f"scrapers.{scraper}")
        scraper_module.scrape()
    except ModuleNotFoundError:
        printWarning(f"No scraper found for {scraper}")
    except AttributeError:
        printError(f"Scrape function not found in the scraper for {scraper}")
    except Exception as e:
        printError(f"An unexpected error occurred: {e}")


manifestFile = "../../static/compatibilities/manifest.yaml"

if not os.path.exists(manifestFile):
    printError(f"Manifest file not found at {manifestFile}")
else:
    manifest = readYaml(manifestFile)
    print()
    if manifest:
        if "names" in manifest:
            for name in manifest["names"]:
                if name == "cert-manager":
                    print(
                        Fore.GREEN
                        + f"Calling scraper for {name}"
                        + Style.RESET_ALL
                    )
                    call_scraper(name)
                    print("\n")
        else:
            printError("No names found in the manifest file.")
    else:
        printError("Failed to read the manifest file.")
