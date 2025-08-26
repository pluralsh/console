#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import yaml
import re

SERVICES = [
    "amazon-eks",
    "azure-kubernetes-service",
    "google-kubernetes-engine"
]

def fetch_extended_versions(service):
    url = f"https://endoflife.date/{service}"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    versions = []
    table = soup.find('table')
    if table:
        rows = table.find_all('tr')[1:]
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                version = cols[0].text.strip()
                extended_support = cols[3].text.strip()

                print(f"Service={service}, Found row: version={version}, support={extended_support}") 
                
                if not re.match(r'^\d+\.\d+$', version):
                    continue
                
                is_extended = "Ends" in extended_support
                print(f"Service={service}, Found row: version={version}, extended?={is_extended}") 
                versions.append({
                    "version": float(version),
                    "extended": is_extended
                })
    return versions

def write_yaml(file_path, data):
    with open(file_path, "w") as file:
        yaml.dump(data, file, default_flow_style=False, sort_keys=False)

if __name__ == '__main__':
    for service in SERVICES:
        versions = fetch_extended_versions(service)
        provider = service.split('-')[0]
        if provider == 'amazon':
            provider = 'eks'
        elif provider == 'azure':
            provider = 'aks'
        elif provider == 'google':
            provider = 'gke'
        
        write_yaml(f'../../static/extended/{provider}.yaml', versions)
    