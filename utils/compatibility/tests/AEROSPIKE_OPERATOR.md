# Aerospike Kubernetes Operator compatibility

This entry lets Plural evaluate Aerospike operator deployments during Kubernetes upgrades. For example, the published range for operator 4.5.0 includes Kubernetes 1.35 but does not include 1.36. An absent catalog entry cannot provide that compatibility information.

The scraper records the current operator release using three official sources:

- [System requirements](https://aerospike.com/docs/kubernetes/install/requirements/): the bounded **Supported Kubernetes versions** section provides both endpoints of the supported Kubernetes range.
- [Helm installation](https://aerospike.com/docs/kubernetes/install/helm/): the operator install command identifies the release to which the current documentation applies.
- [Official Helm index](https://aerospike.github.io/aerospike-kubernetes-enterprise/index.yaml): confirms the stable chart and operator versions.

At the time of this contribution, the documented operator and chart are **4.5.0**, with Kubernetes support **1.23–1.35**, inclusive. Kubernetes 1.36 is not included, even if the repository's `KUBE_VERSION` is newer. The chart and install documentation must agree before the scraper writes an update.

## Historical coverage

The current requirements page is not a historical compatibility matrix. The scraper therefore refreshes only the documented current release. It does not apply today's range to older charts or infer support from a chart's publication date. The shared compatibility updater retains verified historical entries as new releases are added.

The committed table also contains a manually verified historical seed for **operator/chart 3.0.0**, Kubernetes **1.19–1.27**. The [archived official system requirements page](https://web.archive.org/web/20230924065830id_/https://docs.aerospike.com/cloud/kubernetes/operator/system-requirements) explicitly identifies its version as **Operator 3.0.0**, publishes that complete range, and reports an August 22, 2023 update date. It is not mapped by proximity to a release date. The historical page's supported range takes precedence over the chart README's less restrictive installation minimum.

The archive is a source for the committed seed, not a dependency of the daily scraper. The integration test verifies that a current refresh preserves the historical range. Other older releases remain omitted: tagged chart READMEs document historical minimum Kubernetes versions, but those minimums do not establish maximum supported versions.

The upstream [4.5.0 webhook test workflow](https://github.com/aerospike/aerospike-kubernetes-operator/blob/v4.5.0/.github/workflows/webhook-tests.yml) selects Kubernetes 1.23 and 1.35. These are useful corroborating endpoints; the requirements page, rather than an interpolation between CI jobs, is the authority for the inclusive range. Earlier workflows such as [4.4.1](https://github.com/aerospike/aerospike-kubernetes-operator/blob/v4.4.1/.github/workflows/webhook-tests.yml) do not provide an equivalent explicit range. Envtest defaults and Go module versions are not interpreted as historical platform support.

## Update behavior

Each source request has a 30-second timeout and raises on HTTP errors. The scraper rejects non-three-part stable versions, conflicting chart metadata, changed or ambiguous support statements, and disagreement between the documented chart and the latest stable index entry. Range expansion is bounded at Kubernetes minor 100 to reject malformed enormous ranges; it is never clamped to the local `KUBE_VERSION`.

All source parsing completes before the shared updater is called. Source failures therefore leave the existing table alone. The scraper uses the repository's existing `update_compatibility_info` behavior for merging, image enrichment, and writing; it does not introduce a separate persistence implementation or change shared writer error handling.

## Installation prerequisites

The default chart creates cert-manager `Certificate` and `Issuer` resources. Aerospike's Helm installation page requires cert-manager but does not specify a version constraint, so the compatibility table does not invent one. The linked installation instructions also describe namespace permissions and supported Pod Security Admission settings. Aerospike documents Enterprise and Federal database editions, and excludes GKE Autopilot; this table is an upstream Kubernetes version declaration, not a certification of every deployment configuration.

## Validation

From `utils/compatibility`, with the repository's Python requirements and pytest installed:

```sh
python -m pytest tests/test_aerospike_kubernetes_operator.py -q
python -m pytest tests -q
```

The small HTML fixtures are reduced examples of the linked official sections. The Helm-index fixture also includes synthetic prerelease, deprecated, and unrelated-chart entries to exercise filtering. Tests cover the parser and update boundary without requiring network access or a running Kubernetes cluster. For an actual refresh, install Helm, disable optional paid summarization, and run from the same directory:

```sh
EXA_API_KEY= OPENAI_API_KEY= python -c "import importlib; importlib.import_module('scrapers.aerospike-kubernetes-operator').scrape()"
```

The shared updater renders the official Helm chart to discover container images. Helm linting and rendering validate chart metadata and manifests; they do not constitute a live operator/database deployment test.
