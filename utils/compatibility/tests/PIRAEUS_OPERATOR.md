# Piraeus Operator compatibility

`static/compatibilities/manifest.yaml` registers `piraeus-operator` with
`utils/compatibility/main.py`. The dispatcher imports
`scrapers.piraeus-operator` and calls `scrape()` during the daily compatibility
workflow in `.github/workflows/cron.yaml`. No separate hard-coded scraper call
is required. After scraping, the entrypoint collects every manifest entry into
`static/compatibilities.yaml`, which Console's compatibility table consumes.
Keep that aggregate synchronized with the per-app YAML when submitting changes.

The scraper selects the newest stable patch for each minor from version 2.0.0
onward across all pages returned by the official GitHub releases API. Like the
Argo Rollouts scraper, it requests pages of 100 until a short or empty page,
and rejects pagination that stops advancing. All pages must be fetched and
parsed successfully before any compatibility update, so a later-page failure
cannot publish a partial release selection.
For each selected tag it reads the Kubernetes minimum from that tag's README
badge and the chart version from `charts/piraeus/Chart.yaml`, checking that the
chart's `appVersion` matches the release. Missing or malformed sources abort
the scrape before the shared update helper is called.

Kubernetes rows expand the declared minimum through the repository's
`KUBE_VERSION` ceiling. They express that minimum requirement; they do not claim
that every combination was tested upstream or locally. The existing shared
update helper merges/reduces rows and may enrich images with Helm. This change
does not add a Kubernetes cluster test matrix.

Run the offline tests from the repository root (Python 3.10 or later):

```sh
python3 -m venv /tmp/piraeus-tests
/tmp/piraeus-tests/bin/python -m pip install PyYAML==6.0.2 packaging==24.1 colorama==0.4.6
/tmp/piraeus-tests/bin/python -m unittest discover -s utils/compatibility/tests -p 'test_piraeus_operator.py' -v
```

The tests use synthetic release/README/chart fixtures. The entrypoint regression
runs the real `main.py` with the checked-in manifest and per-app YAML files,
imports the real scraper, mocks HTTP and shared update/enrichment operations,
and checks that the scraper's output reaches the aggregate. It also checks that
the checked-in aggregate contains exactly the per-app Piraeus entry.

To regenerate through the same entrypoint as the scheduled workflow, install
Helm and the full Python requirements, then run from `utils/compatibility`:

```sh
python3 -m venv /tmp/piraeus-live
/tmp/piraeus-live/bin/python -m pip install -r requirements.txt
env -u EXA_API_KEY -u OPENAI_API_KEY SCRAPER=piraeus-operator /tmp/piraeus-live/bin/python main.py
```

This makes public HTTP/Helm requests, refreshes `KUBE_VERSION`, waits for the
entrypoint's normal 60-second delay, and regenerates the aggregate for all
manifest entries. Existing EOL enrichment may update other per-app files even
with `SCRAPER` set. Review the resulting diff. The offline regression does not
execute those external operations or paid summarization.
