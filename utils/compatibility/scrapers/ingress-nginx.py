# scrapers/ingress_nginx.py

import requests
from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import printError, update_compatibility_info


def scrape():
    url = "https://github.com/kubernetes/ingress-nginx"
    response = requests.get(url)

    if response.status_code == 200:
        soup = BeautifulSoup(response.content, "html.parser")
        readme_section = soup.find(
            "article", class_="markdown-body entry-content container-lg"
        )

        if readme_section:
            table = readme_section.find("table")
            if table:
                rows = []
                for row in table.find_all("tr")[1:]:  # Skip the header row
                    columns = row.find_all("td")
                    if len(columns) >= 3:  # Ensure there are enough columns
                        ingress_nginx_version = (
                            columns[1].get_text(strip=True).lstrip("v")
                        )
                        k8s_supported_versions = (
                            columns[2].get_text(strip=True).split(", ")
                        )
                        version_info = OrderedDict(
                            [
                                ("version", ingress_nginx_version),
                                ("kube", k8s_supported_versions),
                                ("requirements", []),
                                ("incompatibilities", []),
                            ]
                        )
                        rows.append(version_info)

                update_compatibility_info(
                    "../../static/compatibilities/ingress-nginx.yaml", rows
                )
            else:
                printError("No table found in the README section.")
        else:
            printError("Could not find the README section on the page.")
    else:
        printError(
            f"Failed to fetch the page. Status code: {response.status_code}"
        )
