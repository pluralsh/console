# Kuadrant operator compatibility

The scraper reads the official https://kuadrant.io/helm-charts/index.yaml,
selecting stable exact application/chart version pairs from `kuadrant-operator`.
The fixture is a projection of that index fetched 2026-09-09 (only identity and
Kubernetes constraint fields); it retains prereleases and missing app versions
to exercise exclusions. The historical stable chart 0.11.0 has no `appVersion`,
so we do not invent its application mapping.

Each row uses that chart's `kubeVersion`. The currently published history uses
`>=1.19.0-0`; supported floor syntax is deliberately narrow. Unknown ranges fail
closed. The upper endpoint is Plural's `KUBE_VERSION`, following the Longhorn
chart-floor convention, **not an upstream EOL or tested whole-stack support
ceiling**. The shared reducer retains compatibility boundaries, the first
release of each minor, and the latest release. Newest stable chart wins when
multiple chart releases map to the same exact application version.

Gateway API, cert-manager, and a supported gateway implementation (Istio OR
Envoy Gateway) must be installed as described by the linked official Helm
README. Empty `requirements` does not mean dependency-free: the flat reference
schema cannot express gateway alternatives, and installation-example pins are
not asserted as universal version requirements. Operand deployment additionally
requires a Kuadrant custom resource. Images are obtained by the existing Helm
render/extraction helper, not by deploying workloads.

From `utils/compatibility`, run:

```
python -m unittest discover -s tests -p test_kuadrant_operator.py -v
python -c 'import importlib; importlib.import_module("scrapers.kuadrant-operator").scrape()'
```

Generation needs the existing Python dependencies, Helm on PATH, network access,
and the root `KUBE_VERSION`. No new dependencies are added. Standard `main.py`
registration also includes the application in the combined compatibility table.
