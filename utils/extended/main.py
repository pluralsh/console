#!/usr/bin/env python3
import requests
import yaml
import re

SERVICES = [
    "amazon-eks",
    "azure-kubernetes-service",
    "google-kubernetes-engine"
]

def fetch_extended_versions(service):
    url = f"https://endoflife.date/api/v1/products/{service}"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch product extended info. Status code: {response.status_code}")
        return []

    versions = []
    try:
        data = response.json()
        if not isinstance(data, dict) or 'result' not in data or 'releases' not in data['result']:
            print(f"Unexpected API response format for {service}")
            return []
            
        releases = data['result']['releases']
        for release in releases:
            if not isinstance(release, dict):
                continue
            version = release.get('name')
            
            if not re.match(r'^\d+\.\d+$', str(version)):
                continue
                
            is_maintained = release.get('isMaintained', False)
            is_eol = release.get('isEol', False)
            is_eoas = release.get('isEoas', False)
            
            is_extended = False
            if service in ['amazon-eks', 'azure-kubernetes-service']:
                # For EKS and AKS, extended support is when it's maintained AND in EOL
                is_extended = not is_maintained or is_eol or is_eoas
            elif service == 'google-kubernetes-engine':
                # For GKE, extended support is when it's maintained AND in EOAS
                is_extended = not is_maintained or is_eoas or is_eol
                
            versions.append({
                "version": version,
                "extended": is_extended
            })
    except (ValueError, KeyError) as e:
        print(f"Failed to parse response for {service}: {str(e)}")
        return []
        
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
    