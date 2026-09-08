# VolSync compatibility source and tests

The scraper reads the official [Backube Helm index](https://backube.github.io/helm-charts/index.yaml).
It records the Kubernetes installation constraint declared by each published chart.
This is not a matrix of Kubernetes versions tested by VolSync, nor a guarantee
that a cluster has the required storage capabilities.

The [v0.16.0 chart](https://github.com/backube/volsync/blob/v0.16.0/helm/volsync/Chart.yaml)
declares `^1.20.0-0`. The historical
[v0.3.0 chart](https://github.com/backube/volsync/blob/v0.3.0/helm/volsync/Chart.yaml)
declares `^1.17.0-0`. For these caret constraints, the scraper enumerates stable
Kubernetes 1.x minors from the declared floor through this repository's
`KUBE_VERSION`. It rejects other constraint syntax instead of dropping a possible
upper bound or patch requirement. The `-0` permits Kubernetes prereleases in
Helm; the compatibility table itself contains only stable minor numbers.

The [installation documentation](https://volsync.readthedocs.io/en/stable/installation/index.html)
requires a snapshot controller and describes CSI snapshot/clone prerequisites.
Those requirements are independent of the Kubernetes version range. No
snapshot-controller version is invented in the `requirements` field.

All 21 stable application versions in the 2026-09-08 index are parsed, including
0.3.0 through 0.16.0. The shared `reduce_versions` helper retains 14 representative
rows when equal compatibility within a minor can be collapsed. Prerelease app
versions and prerelease charts are excluded. If multiple stable charts target the
same application version, the newest chart wins regardless of index order.

Run the deterministic tests from the repository root:

```sh
python -m unittest discover -s utils/compatibility/tests -p test_volsync.py -v
```

`fixtures/volsync-index.yaml` preserves selected official index fields for old,
current, and prerelease charts. Tests also cover malformed/empty inputs,
unsupported constraints, inconsistent duplicate chart metadata, and failure to
write partial results. They do not contact a cluster.

To run the normal scraper with the dependencies from `requirements.txt` and
Helm installed:

```sh
cd utils/compatibility
python -c 'import importlib; importlib.import_module("scrapers.volsync").scrape()'
```

The shared writer performs Helm image extraction. Optional paid summarization
is enabled by the existing framework only when its API keys are configured.

To reproduce only the generated compatibility rows from a downloaded index,
without Helm or optional summarization:

```python
from pathlib import Path
from importlib import import_module
from utils import read_yaml, reduce_versions, write_yaml

scraper = import_module("scrapers.volsync")
rows = scraper.build_rows(
    Path("/path/to/downloaded/index.yaml").read_bytes(),
    Path("../../KUBE_VERSION").read_text().strip(),
)
data = read_yaml(scraper.OUTPUT_PATH)
data["versions"] = reduce_versions(rows)
write_yaml(scraper.OUTPUT_PATH, data)
```
