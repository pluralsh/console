import boto3
import yaml
from semver import Version

def parse_version(vsn):
    return Version.parse(vsn.lstrip('v'))

def addon_version(boto_vsn):
    return {
        'version': boto_vsn['addonVersion'],
        'compatibilities': [c['clusterVersion'] for c in boto_vsn['compatibilities']]
    }

def to_addon(boto_addon):
    return {
        'name': boto_addon['addonName'],
        'versions': sorted([addon_version(v) for v in boto_addon['addonVersions']], key=lambda v: parse_version(v['version']), reverse=True),
        'publisher': boto_addon['publisher']
    }

def fetch_addons():
    client = boto3.client('eks')
    addons = []
    next_token = None
    while True:
        kwargs = {}
        if next_token:
            kwargs['nextToken'] = next_token
        resp = client.describe_addon_versions(**kwargs)

        for addon in resp['addons']:
            addons.append(to_addon(addon))

        if not resp.get('nextToken'):
            break
        
        next_token = resp['nextToken']
    
    addons.sort(key=lambda a: a['name'])
    return addons

def write_yaml(file_path, data):
    with open(file_path, "w") as file:
        yaml.dump(data, file, default_flow_style=False, sort_keys=False)
    
if __name__ == '__main__':
    addons = fetch_addons()
    write_yaml('../../static/addons/eks.yaml', addons)