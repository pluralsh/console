#!/usr/local/bin/python3
import semver
import subprocess

def get_git_tags():
    try:
        process = subprocess.run(['git', 'tag'], capture_output=True, text=True, check=True)
        tags = process.stdout.splitlines()
        return [t for t in tags if t.startswith('v') and not t.startswith('velero')]
    except subprocess.CalledProcessError as e:
        print(f"Error executing git tag: {e}")
        return None

if __name__ == '__main__':
    tags = get_git_tags()
    sorted_versions = sorted([t.removeprefix('v') for t in tags], key=semver.Version.parse)
    print(sorted_versions[-1])