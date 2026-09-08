# Kured compatibility scraper

Run the focused tests from the repository root (Python 3.9+ with PyYAML):

```sh
python -m unittest discover -s utils/compatibility/tests -p test_kured.py -v
```

Run the scraper with the repository's compatibility dependencies and Helm installed:

```sh
cd utils/compatibility
python -c "import importlib; importlib.import_module('scrapers.kured').scrape()"
```

## Sources and semantics

- Official documentation: https://kured.dev/docs/installation/
- Fixture source: https://github.com/kubereboot/website/blob/main/content/en/docs/installation.md
- Fixture has trailing blank lines trimmed.
- Source Git blob SHA: `1d734d308b0c9f8bfe09048b37a2f916efe923d0`
- Official Helm index: https://kubereboot.github.io/charts/index.yaml
- Retrieved on 2026-09-08.

`fixtures/kured-index.yaml` projects only the 20 selected published chart entries
from that index, preserving their application/chart versions, digests and URLs.
It is a source fixture, not a full copy of the chart repository.

The matrix describes **expected compatibility**, not a certified or exhaustive
test matrix. The scraper preserves its explicit values, including the future
Kubernetes 1.37 minor listed for Kured 1.23.0. It does not infer additional minors,
copy current compatibility onto historical releases, or fill absent Kured rows
(for example, 1.18.0 is not in this source).

The source has 24 release rows. Twenty have exact stable application-version
matches in the Helm index. Kured 1.0.0, 1.1.0, 1.2.0 and 1.3.0 have no matching
chart in that index and are omitted. Multiple charts for an application version
are resolved to the numerically highest stable chart version. Prereleases are
excluded.

The tests cover matrix parsing, source drift, malformed/duplicate rows, exact
chart matching, prereleases, numeric version ordering, source failures before
writing, and agreement between the generated per-app and aggregate data.
Writer-boundary tests mock the existing shared writer. They do not establish
that Helm templating or Kubernetes deployment works. The initial checked-in
table contains no inferred image list; the existing shared writer enriches
images when it runs with Helm.
