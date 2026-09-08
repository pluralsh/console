# MetalLB Helm compatibility

Source: the [official MetalLB Helm index](https://metallb.github.io/metallb/index.yaml),
linked by the [official installation guide](https://metallb.io/installation/).
The scraper reads the `metallb` chart's own `appVersion`, `version` and
`kubeVersion` fields. It encodes Helm installation constraints, not results of
testing every listed Kubernetes version with every networking configuration.

The current stable charts from 0.13.9 through 0.16.1 declare `>= 1.19.0-0`.
This is more restrictive than the website's generic Kubernetes 1.13 minimum.
The chart constraint is used for these Helm installations. Earlier charts do
not declare `kubeVersion` and are excluded. The index's development chart
`0.0.0` (whose appVersion misleadingly names 0.14.1) and prereleases are also
excluded. No missing release is synthesized.

Each chart is considered independently. The highest stable chart version wins
when multiple charts package the same application release. The current parser
supports only an explicit `>= 1.minor.0` bound, optionally ending in `-0`.
Missing or changed constraints in the supported release range abort the scrape
before any shared update. A future upper bound or nonzero patch minimum needs
review; it is never silently rounded or removed. The open upper bound expands
only through the repository's current `KUBE_VERSION` (1.36).

The shared updater reduces the result to representative version boundaries and
resolves chart images with Helm. Chart 0.16.0 has a null FRR-K8s Prometheus
configuration in its default values, causing a template nil-pointer error.
The metadata's `helm_values` explicitly disables the optional FRR-K8s
ServiceMonitor and PrometheusRule to render this release. It does not disable
the FRR-K8s workload or replace its images. These two values are applied to all
rendered releases for reproducibility.

Cloud/network-addon compatibility,
available address pools, speaker privileges, IPVS strict ARP, and BGP/L2 setup
are still required as described by MetalLB's installation documentation. Helm
version acceptance alone does not establish that those requirements are met.

## Tests

Use the repository test entry point from the repository root with Make and
Docker Compose. The existing test image is Alpine-based and does not include
Python. Install the test dependencies in its disposable container:

```sh
TEST_CMD='apk add --no-cache python3 py3-pip && python3 -m venv /tmp/metallb-tests && /tmp/metallb-tests/bin/python -m pip install packaging==24.1 PyYAML==6.0.2 && /tmp/metallb-tests/bin/python -m unittest discover -s utils/compatibility/tests -p test_metallb.py -v'
CONSOLE_CMD="\"$TEST_CMD\"" make test-full TEST_CMD="$TEST_CMD"
```

Both variables are needed because the Compose file currently consumes
`CONSOLE_CMD`, while the Makefile documents `TEST_CMD`. Embedded quotes preserve
one command argument for `/bin/sh -c`. The Make target retains dependency startup,
console exit-code propagation, and teardown. The focused workflow uses the same
command and pins checkout to a full commit SHA.

The six unit tests cover per-chart bounds, app/chart version separation,
prerelease/development filtering, duplicate-chart selection and conflicts,
unsupported/missing constraints, malformed sources and entry-point atomicity.
They passed directly with Python 3.13 during development. The Windows host has
no Make or Docker, so local verification does not establish that the Docker
wrapper or hosted CI passed.

## Regeneration

With the repository compatibility Python environment and Helm 3 on PATH, run
from `utils/compatibility`:

```sh
OPENAI_API_KEY= EXA_API_KEY= python -c 'from scrapers.metallb import scrape; scrape()'
```

This fetches public chart metadata and renders Helm templates locally to extract
images. It does not install anything into a cluster. Optional paid summaries
are disabled by the empty API keys.
