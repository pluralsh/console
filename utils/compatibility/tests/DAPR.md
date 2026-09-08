# Dapr release-tagged CI targets

This scraper records the finite Kubernetes targets configured in each released
Dapr tag's Linux KinD E2E workflow. These are **configured test targets**, not a
universal Kubernetes support window, proof that historical CI runs passed, or a
locally executed cluster matrix. The chart metadata identifies released artifacts;
it is not used to infer Kubernetes compatibility.

The [Dapr support policy](https://docs.dapr.io/operations/support/support-release-policy/)
describes a rolling current-and-two-previous minor window. Discovery therefore
starts with stable chart-backed releases in the newest three minor series. In
this snapshot those are 1.16, 1.17 and 1.18. Already-recorded older series remain
available when that discovery window advances. The SDK compatibility and upgrade
path tables are not Kubernetes compatibility evidence.

The source for each candidate is:
`https://raw.githubusercontent.com/dapr/dapr/v{version}/.github/workflows/kind-e2e.yaml`.
It explicitly declares `k8s-version` and deployment-mode axes, pins KinD node image
digests, builds the checked-out runtime, deploys it and runs `make test-e2e-all`.
Only those listed Kubernetes minors are recorded. Dynamic matrices, new axes,
nonempty exclusions, conflicting/unpinned includes and inactive or commented-out
build/deploy/test commands fail closed for review instead of being guessed.

The [official Helm index](https://dapr.github.io/helm-charts/index.yaml) maps stable
application and chart versions separately. It is resolved before applying the
repository's reducer. Every candidate's own tagged workflow is checked, including
patches; no patch inherits a different tag's target matrix. Reduction retains the
first minor release, target changes and the overall latest patch:

| Dapr / chart | Configured Kubernetes targets |
| --- | --- |
| 1.18.3 | 1.34, 1.33, 1.32 |
| 1.18.0 | 1.34, 1.33, 1.32 |
| 1.17.0 | 1.34, 1.33, 1.32 |
| 1.16.4 | 1.34, 1.33, 1.32 |
| 1.16.0 | 1.31, 1.30, 1.29 |

The target change occurs at 1.16.4. The five default Helm renders provide the
operator, injector, placement, scheduler and sentry images stored in the YAML.
Sidecar images injected into application deployments are not fabricated from
release names. No historical support dates are inferred.

## Offline verification

From the repository root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r utils/compatibility/requirements.txt
env -u EXA_API_KEY -u OPENAI_API_KEY .venv/bin/python -m unittest discover -s utils/compatibility/tests -p 'test_dapr.py' -v
```

The 23 tests cover strict chart/version matching, finite matrices, source changes,
commented or disabled test commands, patch target changes, history preservation,
delayed charts, no-op updates and manifest/aggregate consistency. Fixture source
URLs and retrieval dates are embedded in each YAML file. Workflow fixtures contain
the exact `e2e` job extracted from their identified release tags; the index fixture
contains exact representative entries. They perform no network requests.

## Live refresh

Install Helm and use isolated Helm configuration/cache/data directories and an
empty Docker configuration if the host has unrelated credential helpers. Then:

```sh
cd utils/compatibility
env -u EXA_API_KEY -u OPENAI_API_KEY ../../.venv/bin/python -c 'import importlib; importlib.import_module("scrapers.dapr").scrape()'
```

This updates the per-app YAML; synchronize its aggregate entry before submitting.
The submitted data was validated against the repository schema. The five chart
archive digests and internal Chart.yaml app/chart versions were checked against
the official index, all five charts rendered, and an unchanged repeat scrape
preserved the YAML byte-for-byte. No paid summarization or Kubernetes deployment
was used for this contribution.
