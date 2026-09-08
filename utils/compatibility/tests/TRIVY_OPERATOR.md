# Trivy Operator compatibility sources

The scraper joins the [official Helm index](https://aquasecurity.github.io/helm-charts/index.yaml)
to `.github/workflows/build.yaml` at each exact `v{appVersion}` tag of
[aquasecurity/trivy-operator](https://github.com/aquasecurity/trivy-operator).
The [upstream installation guide](https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/)
documents this Helm repository.

## Meaning of the Kubernetes list

The list contains the Kubernetes minors explicitly configured in that release's
KIND integration, end-to-end, and chart-test jobs. It is CI-target evidence,
following the release-workflow approach used by the Argo Rollouts scraper.
It is not an exhaustive upstream support policy or a claim that this contribution
ran Trivy Operator on those Kubernetes versions. An omitted minor is unverified
by this source, rather than evidence of incompatibility.

Only actual `image` inputs to `engineerd/setup-kind` and `helm/kind-action`
are considered. Global, job, and step environment values are resolved in order;
unused image variables and unrelated text are ignored. The scraper does not fill
gaps between tested minors or extend the list to `KUBE_VERSION`.

For example:

| Exact release source | Kubernetes minors |
| --- | --- |
| [v0.0.8](https://github.com/aquasecurity/trivy-operator/blob/v0.0.8/.github/workflows/build.yaml) | 1.21 |
| [v0.23.0](https://github.com/aquasecurity/trivy-operator/blob/v0.23.0/.github/workflows/build.yaml) | 1.31 |
| [v0.30.0](https://github.com/aquasecurity/trivy-operator/blob/v0.30.0/.github/workflows/build.yaml) | 1.33, 1.31 |
| [v0.30.1](https://github.com/aquasecurity/trivy-operator/blob/v0.30.1/.github/workflows/build.yaml) | 1.34, 1.31 |

The 0.30.0 to 0.30.1 change is why the scraper fetches every chart-backed
application patch, rather than assigning one matrix to an entire release family.
The corresponding fixtures are unmodified copies of these four source files,
retrieved on 2026-09-08. They are test data and are never executed as workflows.

## Chart selection and refresh behavior

Stable application and chart versions must be complete semantic versions.
For each exact application version, the highest stable chart version is selected
numerically. An application version is not assumed to equal its chart version:
for example, application 0.22.0 maps to chart 0.24.1.

The scraper fetches and parses every selected workflow before invoking the
shared writer. An HTTP failure, timeout, missing workflow, or unresolved cluster
image aborts the update. The existing table remains untouched. The common writer
preserves metadata and historical rows, reduces redundant patch releases, and
renders the selected Helm charts to collect their images.

## Verification and regeneration

From the repository root, install the repository's compatibility dependencies
and pytest, then run:

```sh
python -m pytest -q utils/compatibility/tests/test_trivy_operator.py
python -m pytest -q utils/compatibility/tests
```

With Helm installed, refresh only this scraper from the compatibility directory:

```sh
cd utils/compatibility
python -c 'import importlib; importlib.import_module("scrapers.trivy-operator").scrape()'
```

The manifest also registers it for the normal scheduled compatibility update.
No new runtime dependency is needed.
