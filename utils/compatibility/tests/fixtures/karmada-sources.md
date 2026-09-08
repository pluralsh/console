# Karmada fixture sources

Retrieved from official sources on 2026-09-08:

- `karmada-compatibility.md`: the Kubernetes compatibility section from
  <https://raw.githubusercontent.com/karmada-io/karmada/master/README.md>.
- `karmada-chart-index.yaml`: unmodified entries for application releases 1.17.0,
  1.18.0, 1.18.1 and 1.19.0 from
  <https://raw.githubusercontent.com/karmada-io/karmada/master/charts/index.yaml>.
  The additional 1.18.1 entry verifies that a minor-series boundary is mapped to
  its exact .0 appVersion, rather than substituting a different patch release.

The matrix describes release series. The scraper normalizes a minor-only label
to its .0 boundary, requires a matching application version in the Helm index,
and preserves explicit patch versions if the matrix starts publishing them.
Only checkmarks are recorded; HEAD, blank cells and partial compatibility (`+`
and `-`) do not establish full compatibility.

The official chart installation guide confirms the repository URL:
<https://github.com/karmada-io/karmada/tree/master/charts/karmada>.
The scheduled Kubernetes compatibility tests set `CLUSTER_VERSION` before
creating both host and member clusters:
<https://github.com/karmada-io/karmada/blob/master/.github/workflows/ci-schedule.yml>
and <https://github.com/karmada-io/karmada/blob/master/hack/setup-dev-base.sh>.
