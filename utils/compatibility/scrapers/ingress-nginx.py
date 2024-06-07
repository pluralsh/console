# scrapers/ingress_nginx.py

import requests
from bs4 import BeautifulSoup

icon = "https://github.com/pluralsh/plural-artifacts/blob/main/ingress-nginx/plural/icons/nginx.png?raw=true"
git_url = "https://github.com/kubernetes/ingress-nginx"
release_url = (
    "https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v{vsn}"
)


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
                    if len(columns) >= 3:  # check column length
                        ingress_nginx_version = (
                            columns[1].get_text(strip=True).lstrip("v")
                        )
                        k8s_supported_versions = columns[2].get_text(strip=True)
                        rows.append(
                            (ingress_nginx_version, k8s_supported_versions)
                        )

                for ingress_nginx_version, k8s_supported_versions in rows:
                    print(
                        f"Ingress-NGINX version: {ingress_nginx_version}, k8s supported versions: {k8s_supported_versions}"
                    )
            else:
                print("No table found in the README section.")
        else:
            print("Could not find the README section on the page.")
    else:
        print(f"Failed to fetch the page. Status code: {response.status_code}")
