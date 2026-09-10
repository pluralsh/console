# K8GB compatibility scraper

Run the offline tests from the repository root:

```sh
python -m unittest discover -s utils/compatibility/tests -p 'test_k8gb.py' -v
python -m pytest utils/compatibility/tests -q
```

Run this scraper without invoking the global updater or any summarization API:

```sh
cd utils/compatibility
python -m scrapers.k8gb
```

Helm must be installed for live generation. The existing `KUBE_VERSION` file is
used as the upper bound; this scraper does not fetch or modify that file.

## What the compatibility entries mean

The source is the **published** Helm repository at
https://www.k8gb.io/index.yaml, documented in the upstream deployment guides:
https://github.com/k8gb-io/k8gb/blob/v1.0.0/docs/deploy_ns1.md.

A chart's explicit `kubeVersion` whole-minor lower bound is expanded through
Plural's checked-in `KUBE_VERSION`. This records declared Helm installation
requirements, **not** certification from deploying every Kubernetes version.
It follows the existing bounded-range representation in the catalog. It does
not infer support from Kubernetes client dependencies or apply today's moving
README to historical releases.

For example, the published v1.0.0 chart and its release-tag README both state
Kubernetes >=1.21, even though the later development branch now says >=1.32:
https://github.com/k8gb-io/k8gb/blob/v1.0.0/README.md#production-readiness.

Only stable chart/application versions with explicit requirements are eligible.
Older charts without `kubeVersion`, prereleases and deprecated charts are
excluded. Complex or patch-level constraints are rejected rather than rounded
into falsely supported whole minors. Literal chart version prefixes are
preserved for Helm; application versions are normalized for the catalog.

The full chart index is read once. A downloaded archive must match its SHA-256
digest and its packaged Chart.yaml must agree with the index. The existing
boundary/latest reducer selects catalog rows. Every retained chart must render
successfully and yield container images before the first table write; an error
cannot write the first half of a batch. There is no cluster deployment, Helm
installation, or paid summarization/model call.

## Fixtures and test boundaries

`fixtures/k8gb/index.yaml` contains unchanged selected fields from four actual
index entries retrieved on 2026-09-09: v1.0.0, v0.14.0, v0.21.0-rc4 and v0.8.8.
Only name/version/appVersion/kubeVersion/digest/urls are retained. The original
full index and archive digests are recorded in the validation artifacts.
Synthetic archives in the tests are clearly test inputs, not live results.

Offline tests substitute only the HTTP and Helm process boundaries; production
parsing, archive digest/metadata verification, image extraction, reduction,
merge and YAML writing are executed. Failure cases check that existing file
bytes remain unchanged. A separate live audit runs the actual scraper with
real HTTP and Helm twice, without these substitutes.

The aggregate registration adds only the K8GB block. It intentionally does not
rewrite the unrelated pre-existing differences between the per-app files and
`static/compatibilities.yaml`.
