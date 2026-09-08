# Knative Operator compatibility sources

The scraper describes the default Knative release associated with each Operator
application minor. Independently selected Serving/Eventing versions and custom
manifests are outside this table's scope.

## Reproducible support rule

The [Knative release schedule](https://github.com/knative/community/blob/main/mechanics/RELEASE-SCHEDULE.md)
provides a release date and Kubernetes minimum for each Knative minor. The
[release principles](https://github.com/knative/community/blob/main/mechanics/RELEASE-VERSIONING-PRINCIPLES.md#k8s-minimum-version-principle)
tie the supported Kubernetes range to the Knative release cut and qualify the
latest patch of each Kubernetes minor. The schedule's explicit minimum is the
component-specific lower bound.

We derive a finite list: include each Kubernetes minor at or above that minimum
whose stable `.0` release was published by the Knative minor's scheduled cut date.
Every Operator patch in that minor uses the same list. This is an inference from
the documented policy and dated releases, not a claim that all later Kubernetes
versions are qualified. Older Kubernetes patch versions are not independently
qualified by this minor-level table.

The [official Helm index](https://knative.github.io/operator/index.yaml) identifies
released Operator application and chart versions. Exact chart versions retain
their `v` prefix. Prereleases are excluded; build metadata is rejected because the
shared updater does not support it. A scheduled release without a stable
chart is not emitted. If multiple charts target one application version, the
newest stable chart is selected deterministically.

The [Kubernetes stable marker](https://dl.k8s.io/release/stable.txt) bounds the
history lookup. Each minor's GA date comes from its exact GitHub release, for
example [v1.33.0](https://github.com/kubernetes/kubernetes/releases/tag/v1.33.0),
using `published_at` from `/repos/kubernetes/kubernetes/releases/tags/v1.33.0`.
The lookup requires a complete sequence with increasing dates. It does not use
patch-release timestamps or assume that a fixed page count covers history.

Examples verified on 2026-09-08:

- Knative 1.18 was cut on 2025-04-22. Kubernetes 1.33 GA followed on 2025-04-23,
  so the list is 1.31 and 1.32, even though the Operator chart appeared later.
- Knative 1.23 was cut on 2026-07-28 with minimum 1.34. The list is 1.34, 1.35,
  and 1.36. Kubernetes 1.37 is excluded even from the September Operator patch.
- The schedule states minimum 1.29 for Knative 1.16, while the
  [Operator 1.16.6 embedded helper](https://github.com/knative/operator/blob/knative-v1.16.6/vendor/knative.dev/pkg/version/version.go)
  contains a lower enforcement constant. The table follows the documented
  support minimum, not merely the runtime admission check.

## Refresh and tests

Run the scraper through the existing compatibility runner with
`SCRAPER=knative-operator`. Retrieval, parsing, and range validation finish before
calling the existing update helper. Failure while fetching or validating the
compatibility sources prevents the updater from being called. The scraper itself
requires no additional Python dependencies. The committed table uses the shared
updater's existing reduction of repeated compatibility ranges; the parser still
processes every stable chart in the index.

Run the isolated tests from the repository root:

```sh
python -m unittest discover -s utils/compatibility/tests -p 'test_knative*.py' -v
```

Tests use recorded and synthetic data, without network requests, Helm execution,
or credentials. Helm, image enrichment, and optional summary generation are
handled by the existing shared updater, not by the parser tests.
