# main.py
import os
import importlib
from utils import readYaml


def call_scraper(scraper):
    try:
        scraper_module = importlib.import_module(f"scrapers.{scraper}")
        scraper_module.scrape()
    except ModuleNotFoundError:
        print(f"Error: No scraper found for {scraper}")
    except AttributeError:
        print(
            f"Error: The scraper module {scraper} does not have a 'scrape' function."
        )
    except Exception as e:
        print(
            f"An unexpected error occurred while calling scraper for {scraper}: {e}"
        )


manifestFile = "../../static/compatibilities/manifest.yaml"

if not os.path.exists(manifestFile):
    print(f"Error: The file {manifestFile} does not exist.\n")
else:
    manifest = readYaml(manifestFile)
    if manifest:
        if "names" in manifest:
            for name in manifest["names"]:
                if name == "ingress-nginx":
                    print(f"Calling scraper for {name}")
                    call_scraper(name)
                    print("\n")
        else:
            print("No 'names' key found in the manifest.\n")
    else:
        print("Failed to read the manifest file.\n")
