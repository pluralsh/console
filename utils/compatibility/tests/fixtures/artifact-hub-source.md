# Artifact Hub source fixture

The YAML fixture retains only `version`, `appVersion`, and `kubeVersion` from
the official [Helm index](https://artifacthub.github.io/helm-charts/index.yaml),
retrieved September 8, 2026. Its comment records the full downloaded file's
SHA-256. All 44 entries are retained, including 15 historical charts without
`kubeVersion`.

These constraints describe Helm installation eligibility. They do not establish
which Kubernetes versions upstream tested, or whether optional dependencies run
on every eligible version. The open lower bounds are capped at the repository's
`KUBE_VERSION` when generating minor-version rows. Maintainer agreement to this
interpretation is pending in [#4228](https://github.com/pluralsh/console/issues/4228).

Charts before 0.17.0 have no declared constraint and are omitted. Later charts
must declare a recognized whole-minor lower bound; missing values and unfamiliar
constraint syntax fail before updating the compatibility file. Only the latest
stable chart for each stable application version is selected. Conflicting
duplicate chart versions fail instead of relying on index ordering.

To run the offline tests, install the compatibility requirements and pytest,
then run from the repository root:

```sh
python -m pytest utils/compatibility/tests/test_artifact_hub.py
```

The fetch and update boundaries are mocked in scraper tests. No chart is
installed, no Kubernetes cluster is contacted, and no paid AI service is used.
