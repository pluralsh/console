# OpenKruise scraper

From the repository root, with the compatibility dependencies installed:

```sh
python -m unittest discover -s utils/compatibility/tests -p 'test_openkruise.py' -v
```

The tests use the upstream installation matrix captured in
`fixtures/openkruise-matrix.html` on 2026-09-08. They make no network requests.

For live regeneration, install Helm and run from `utils/compatibility`:

```sh
env -u OPENAI_API_KEY -u EXA_API_KEY python -c 'from scrapers import openkruise; openkruise.scrape()'
```

This reads the [official installation matrix](https://openkruise.io/docs/installation)
and [Helm chart index](https://openkruise.github.io/charts/index.yaml), then uses
the shared updater to reduce versions, render charts, and collect image names.
The environment overrides disable the optional paid summarization calls.

`kube` records only columns marked `✓`, which upstream defines as exact API
object/field parity. It does not include `+` or `-` (partial API compatibility),
`?` (untested), or interpolate Kubernetes versions absent from the matrix.
Excluded combinations are not declared incompatible. This is a conservative
subset of upstream's compatibility information, not a claim of cluster testing.

The matrix specifies release families, such as `1.9.x`. Published stable chart
`appVersion` values are joined to those families, including their patch releases.
Versions absent from the matrix are skipped. The shared reducer keeps the first
patch of each compatibility range and the latest application version.

Live chart rendering also exercises CRD schema fields named `image`. The shared
image walker must ignore those mappings while collecting container image strings.
