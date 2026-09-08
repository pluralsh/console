# EMQX Operator compatibility sources

The scraper joins stable application/chart pairs from the official
[EMQX Helm index](https://repos.emqx.io/charts/index.yaml) to the README at each
exact [EMQX Operator release tag](https://github.com/emqx/emqx-operator/tags).
It reads every published stable application release; it does not substitute the
moving `latest` documentation for historical release requirements. Prerelease
charts and prerelease application versions are excluded. When multiple stable
charts package the same application, the newest chart is selected.

The release documents contain three explicit forms of Kubernetes requirements:

- [1.2.8](https://github.com/emqx/emqx-operator/blob/1.2.8/README.md) declares
  `>=1.20.0`. This format continues through operator 2.1.0.
- [2.1.1](https://github.com/emqx/emqx-operator/blob/2.1.1/README.md) declares
  `>=1.24`. Its quoted exception for clusters without `MixedProtocolLBService`
  is excluded. Later [2.1.2](https://github.com/emqx/emqx-operator/blob/2.1.2/README.md)
  and [2.2.29](https://github.com/emqx/emqx-operator/blob/2.2.29/README.md) tables
  agree on full-feature support from 1.24 upwards; restricted rows are excluded.
- [2.3.2](https://github.com/emqx/emqx-operator/blob/2.3.2/README.md) declares
  access to a Kubernetes `v1.24+` cluster under **Development / Prerequisites**.
  The 2.3.x README no longer contains the earlier general compatibility table.
  This is a declared prerequisite, not a published tested-version matrix.

Only these explicit open-ended requirements are expanded, ending at this
repository's `KUBE_VERSION`; an omitted maximum alone does not establish a range.
Missing, conflicting, restricted, or newly bounded recognized requirements abort
the run before any compatibility data is written. A missing release document
also aborts the whole join instead of silently dropping that release.

The official index on 2026-09-08 contained 53 distinct stable application
releases. The existing shared reducer keeps eight minor/support boundaries and
the latest release. Older chart versions differ from their application versions:
for example, chart 1.0.6 packages operator 1.2.0. All eight retained chart archives
were downloaded from the official repository and their SHA-256 digests and
`Chart.yaml` application/chart versions were checked against the index.
The live scraper rendered all eight charts successfully and recorded their
actual container images. The add-on, manifest, and aggregate were validated
against `static/compatibilities/schema.json`.

Fixtures are actual upstream excerpts with source URLs and retrieval dates.
Tests cover both historical table formats, conditional requirements, reordered
columns, removed full-support rows, newly introduced bounds, malformed input,
exact chart mappings, duplicate chart selection, prereleases, and unavailable
release documents. The chart-image fixture retains relevant subtrees from an
actual Helm render: CRD schema properties named `image` must not be mistaken for
pod container image references.

Run from `utils/compatibility` with Python 3.10+ and the dependencies in
`requirements.txt` installed:

```sh
env -u OPENAI_API_KEY -u EXA_API_KEY python -m unittest discover -s tests -p 'test_emqx_operator.py' -v
env -u OPENAI_API_KEY -u EXA_API_KEY python -m unittest discover -s tests -p 'test_chart_images.py' -v
```

Run the live scraper from the same directory, with `helm` on `PATH` and separate
Helm configuration/cache/data directories when other scrapers run concurrently:

```sh
env -u OPENAI_API_KEY -u EXA_API_KEY python -c 'import importlib; importlib.import_module("scrapers.emqx-operator").scrape()'
```

The declared compatibility data and chart rendering checks do not establish that
every listed Kubernetes version has been tested with a deployed EMQX cluster.
