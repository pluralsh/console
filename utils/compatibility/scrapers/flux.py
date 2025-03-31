from bs4 import BeautifulSoup
from collections import OrderedDict
from utils import (
    print_error,
    fetch_page,
    update_compatibility_info,
    update_chart_versions,
    expand_kube_versions,
    current_kube_version,
    print_warning,
    sort_versions,
    read_yaml,
    write_yaml,
)
import urllib.parse

app_name = "flux"
base_url = "https://fluxcd.io/flux/installation/"
helm_repository_url = "https://fluxcd-community.github.io/helm-charts"
chart_name = "flux2"


def parse_page(content):
    soup = BeautifulSoup(content, "html.parser")
    return soup


def get_available_versions(soup):
    versions_dropdown = soup.find("li", {"class": "nav-item dropdown mr-4"})
    if not versions_dropdown:
        return []

    versions = []
    seen_versions = set()
    dropdown_menu = versions_dropdown.find("div", {"class": "dropdown-menu"})
    if dropdown_menu:
        for item in dropdown_menu.find_all("a", {"class": "dropdown-item"}):
            href = item.get("href", "")
            version_text = item.get_text().strip()
            if version_text.startswith("v") and href:
                version = version_text.lstrip("v")
                try:

                    if version.count(".") == 0 and version.isdigit():
                        version = f"{version}.0.0"
                    elif version.count(".") == 1:
                        major, minor = version.split(".")
                        if major.isdigit() and minor.isdigit():
                            version = f"{major}.{minor}.0"
                except Exception:

                    pass

                if version in seen_versions:
                    continue
                seen_versions.add(version)

                full_url = urllib.parse.urljoin(base_url, href)

                if "/installation/" not in full_url.lower():
                    parsed_url = urllib.parse.urlparse(full_url)
                    if parsed_url.path.strip("/") == "":
                        full_url = urllib.parse.urljoin(full_url, "flux/installation/")
                    else:
                        full_url = full_url.rstrip("/") + "/installation/"

                versions.append({"version": version, "url": full_url})
    return versions


def find_compatibility_table(soup):
    tables = soup.find_all("table")
    for table in tables:
        headers = [th.get_text().lower() for th in table.find_all("th")]
        if any("kubernetes version" in h for h in headers):
            return table
    return None


def clean_version(version):
    version = version.replace(">=", "").strip()
    version = version.replace("and later", "").strip()
    version = version.lstrip("v")
    version = version.rstrip(". ")
    return version


def extract_table_data(table, flux_version):
    if not table:
        return []
    try:
        headers = [th.get_text().lower().strip() for th in table.find_all("th")]
        kube_version_idx = -1
        for i, h in enumerate(headers):
            if "kubernetes version" in h:
                kube_version_idx = i
                break

        flux_version_idx = -1
        for i, h in enumerate(headers):
            if "flux version" in h:
                flux_version_idx = i
                break

        if flux_version_idx == -1:

            flux_version_idx = 0

        if kube_version_idx == -1:
            print_warning(
                f"Could not find 'Kubernetes Version' column for Flux {flux_version}"
            )
            return []

        kube_versions_for_this_flux_version = []

        for row in table.find_all("tr")[1:]:
            cols = row.find_all("td")
            if len(cols) <= max(flux_version_idx, kube_version_idx):
                continue
            if flux_version_idx >= 0:
                row_flux_version = clean_version(
                    cols[flux_version_idx].get_text().strip()
                )

                if flux_version_idx > 0 and row_flux_version != flux_version:
                    continue
            kube_text_raw = cols[kube_version_idx].get_text().strip()
            kube_text_check = kube_text_raw.replace(">=", "").strip().lower()
            should_expand = "and later" in kube_text_check

            if should_expand:
                base_version_text = kube_text_check.replace("and later", "").strip()
                base_version = clean_version(base_version_text)
                if base_version:

                    base_parts = base_version.split(".")
                    if len(base_parts) > 2:

                        base_version_2part = f"{base_parts[0]}.{base_parts[1]}"
                    else:
                        base_version_2part = base_version

                    try:
                        expanded_versions = expand_kube_versions(
                            base_version_2part, current_kube_version()
                        )
                        kube_versions_for_this_flux_version.extend(expanded_versions)
                    except Exception as e:
                        print_warning(
                            f"Could not expand versions from {base_version}: {str(e)}"
                        )

                        kube_versions_for_this_flux_version.append(base_version)
                else:

                    versions_in_cell = [
                        clean_version(v.strip()) for v in kube_text_raw.split(",")
                    ]
                    versions_to_add = [v for v in versions_in_cell if v]
                    kube_versions_for_this_flux_version.extend(versions_to_add)
            else:
                versions_in_cell = [
                    clean_version(v.strip()) for v in kube_text_raw.split(",")
                ]
                versions_to_add = [v for v in versions_in_cell if v]
                kube_versions_for_this_flux_version.extend(versions_to_add)

        seen = set()
        final_kube_versions = [
            str(x)
            for x in kube_versions_for_this_flux_version
            if x and not (str(x) in seen or seen.add(str(x)))
        ]

        if not final_kube_versions:

            print_warning(f"No valid Kubernetes versions found for Flux {flux_version}")
            return []

        return [
            OrderedDict(
                [
                    ("version", flux_version),
                    ("kube", final_kube_versions),
                    ("requirements", []),
                    ("incompatibilities", []),
                ]
            )
        ]
    except Exception as e:
        import traceback

        print_error(f"Error in extract_table_data: {str(e)}")
        return []


def scrape():
    try:
        page_content = fetch_page(base_url)
        if not page_content:
            return

        soup = parse_page(page_content)
        try:
            version_info = get_available_versions(soup)
        except Exception as e:
            print_error(f"Error in get_available_versions: {str(e)}")
            return

        if not version_info:
            print_error("No Flux versions found.")
            return

        version_map = {}

        for info in version_info:
            try:
                version = info["version"]
                version_url = info["url"]

                version_content = fetch_page(version_url)
                if not version_content:
                    print_warning(f"Could not fetch content for {version_url}")
                    continue

                version_soup = parse_page(version_content)

                try:
                    table = find_compatibility_table(version_soup)
                except Exception as e:
                    print_error(f"Error finding compatibility table: {str(e)}")
                    continue

                if table:
                    try:
                        rows = extract_table_data(table, version)
                    except Exception as e:
                        print_error(f"Error extracting table data: {str(e)}")
                        continue

                    if rows:
                        current_data = rows[0]
                        if version in version_map:
                            existing_kube = version_map[version].get("kube", [])
                            new_kube = current_data.get("kube", [])
                            combined_kube = existing_kube + new_kube

                            seen_kube = set()
                            unique_kube = [
                                k
                                for k in combined_kube
                                if not (k in seen_kube or seen_kube.add(k))
                            ]
                            version_map[version]["kube"] = unique_kube
                        else:
                            version_map[version] = current_data
                    else:
                        print_warning(
                            f"No valid data extracted for Flux {version} at {version_url}"
                        )
                else:
                    print_warning(
                        f"No compatibility table found for Flux {version} at {version_url}"
                    )
            except Exception as e:
                print_error(f"Error processing {info}: {str(e)}")
                continue

        if version_map:
            all_rows_list = list(version_map.values())
            sorted_rows = sort_versions(all_rows_list)

            output_file = f"../../static/compatibilities/{app_name}.yaml"
            update_compatibility_info(output_file, sorted_rows)

            try:
                yaml_data = read_yaml(output_file)
                if yaml_data:
                    yaml_data["helm_repository_url"] = helm_repository_url
                    write_yaml(output_file, yaml_data)

                update_chart_versions(app_name, chart_name=chart_name)
            except Exception as e:
                print_error(f"Error updating chart versions: {str(e)}")
        else:
            print_error("No compatibility information found across all versions.")
    except Exception as e:
        import traceback

        print_error(f"An unexpected error occurred: {str(e)}")
        traceback.print_exc()
