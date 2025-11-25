from __future__ import annotations

import re
from collections import OrderedDict
from typing import Iterable

from utils import (
    get_github_releases_timestamps,
    get_kube_release_info,
    find_last_n_releases,
    update_compatibility_info,
    clean_kube_version,
)

app_name = "opa-gatekeeper"


def scrape():
    kube_releases = get_kube_release_info()
    gatekeeper_releases = list(reversed(list(get_github_releases_timestamps("open-policy-agent", "gatekeeper"))))

    versions = []
    for gk_release in gatekeeper_releases:
        if "-" in gk_release[0]:
            continue
        release_vsn = gk_release[0].replace("v", "")
        compatible_kube_releases = find_last_n_releases(kube_releases, gk_release[1], n=3)
        vsn = {
            "version": release_vsn,
            "kube": [clean_kube_version(kube_release[0]) for kube_release in compatible_kube_releases],
            "requirements": [],
            "incompatibilities": [],
        }
        versions.append(vsn)

    update_compatibility_info(f"../../static/compatibilities/{app_name}.yaml", versions)
