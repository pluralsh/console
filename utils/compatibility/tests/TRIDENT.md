# Trident Operator compatibility sources

The scraper uses the official [Trident Helm index](https://netapp.github.io/trident-helm-chart/index.yaml)
to discover released application/chart pairs. Each pair is joined to the
application's **exact release tag** in `NetApp/trident/config/config.go`.
`KubernetesVersionMin` and `KubernetesVersionMax` specify its supported range.
The result is intersected with that chart's `kubeVersion` constraint.

This matters in both directions:

- [26.06.1](https://github.com/NetApp/trident/blob/v26.06.1/config/config.go)
  supports 1.27–1.36; the chart's permissive `>= 1.24.0-0` alone overstates support.
  NetApp's [26.06 requirements](https://docs.netapp.com/us-en/trident/trident-get-started/requirements.html)
  independently document the same supported frontend range.
- [21.04.0](https://github.com/NetApp/trident/blob/v21.04.0/config/config.go)
  has a legacy application minimum of 1.11, but its operator chart requires
  `>= 1.16.0 < 1.22.0`. Only the intersection, 1.16–1.21, is advertised.
- [24.10.0](https://github.com/NetApp/trident/blob/v24.10.0/config/config.go)
  ends at Kubernetes 1.31; [24.10.1](https://github.com/NetApp/trident/blob/v24.10.1/config/config.go)
  adds 1.32. Reading only one configuration per release family would miss this.

All 36 stable application versions in the index at validation time (2026-09-09)
were checked. The repository's normal reduction retains 23 rows, including
patch-level changes in support. The range is not extended to Plural's current
Kubernetes version: old releases retain their own explicit upper bounds.

Trident's zero-padded calendar versions are normalized to repository-compatible
semantic versions (`26.06.1` → `26.6.1`). Original strings are retained for source
tag lookups and chart versions. The release link points to the upstream release
list because substituting normalized versions into its tag URLs would break them.

Only syntactically valid prereleases are excluded. Both application and chart
versions are validated before an entry is skipped. Missing or malformed version
metadata, and stable versions with unsupported build metadata, abort before the
catalog writer runs. Missing or malformed release evidence also aborts before
the catalog writer runs. Chart constraints involving patch-level bounds or
unsupported syntax are rejected instead of guessed. A future upstream syntax
change will need a parser update.

## Validation

From `utils/compatibility`, with its requirements and pytest installed:

```sh
PYTHONPATH=. python -m pytest tests -q
```

The new tests cover release/chart intersections, historical bounds, calendar
version mapping, patch-level support changes, duplicate handling, malformed
inputs, network failures, standard writer integration, and repeat-run stability.

The local integration check also verified every downloaded Helm chart against
the index SHA256 and compared its packaged Chart.yaml metadata with the index.
Helm 4.2.4 rendered all 36 packages at both supported endpoints (72 renders).
Rendered image references populated the catalog. Catalog, manifest and aggregate
passed `schema.json`; a second run of the shared writer was byte-identical.

These checks validate metadata and manifest generation, not a live Kubernetes
installation or storage I/O. NetApp backend, node and feature prerequisites
still apply; the Kubernetes table is not a complete deployment readiness check.
