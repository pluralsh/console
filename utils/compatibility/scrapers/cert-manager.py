# scrapers/cert_manager.py

import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import printError, update_compatibility_info


def scrape():
    url = "https://cert-manager.io/docs/releases/"
    response = requests.get(url)

    if response.status_code == 200:
        soup = BeautifulSoup(response.content, "html.parser")
        sections = soup.find_all("h2")

        # Find the target tables based on their headers
        target_tables = []
        for section in sections:
            if section.get_text(strip=True) in [
                "Currently supported releases",
                "Old releases",
            ]:
                table = section.find_next("table")
                if table:
                    target_tables.append(table)

        if target_tables:
            rows = []
            for table in target_tables:
                for row in table.find_all("tr")[1:]:  # Skip the header row
                    columns = row.find_all("td")
                    if len(columns) >= 4:  # Ensure there are enough columns
                        cert_manager_version = (
                            columns[0].get_text(strip=True).rstrip(" LTS")
                        )
                        cert_manager_version = cert_manager_version + ".0"
                        k8s_supported_versions = (
                            columns[3].get_text(strip=True).split(" → ")
                        )
                        version_info = OrderedDict(
                            [
                                ("version", cert_manager_version),
                                ("kube", k8s_supported_versions),
                                ("requirements", []),
                                ("incompatibilities", []),
                            ]
                        )
                        print(cert_manager_version)
                        rows.append(version_info)

            update_compatibility_info(
                "../../static/compatibilities/cert-manager.yaml", rows
            )
        else:
            printError("No target tables found in the README section.")
    else:
        printError(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
