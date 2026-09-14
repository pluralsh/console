# Istio 1.31 chart repository migration

The official [1.31 announcement](https://istio.io/latest/news/releases/1.31.x/announcing-1.31/)
states that 1.31.0 supports Kubernetes 1.32–1.36 and that new charts move from
`istio-release.storage.googleapis.com` to `blob.istio.io/istio-release/charts`.
The old repository has 1.31 prereleases but no stable 1.31.0 chart.

The scraper joins the **Supported Kubernetes Versions** column of the official
[support table](https://istio.io/latest/docs/releases/supported-releases/) to exact
stable application/chart versions in the replacement repository's
[istiod index](https://blob.istio.io/istio-release/charts/index.yaml). The separate
“Tested, but not supported” column is excluded. A documented minor series is never
turned into an invented `.0` chart; only actual chart releases can become records.
The repository's usual minor-boundary/latest-patch reduction still applies.

Fixtures retain source URLs and retrieval dates. Offline tests cover reordered
columns, unsupported rows, malformed/conflicting data, an empty first table,
prereleases, exact chart mappings, delayed boundary charts, metadata retention,
no-op repeats, and failure before writing. Run from `utils/compatibility`:

```sh
env -u OPENAI_API_KEY -u EXA_API_KEY python -m unittest discover -s tests -p 'test_istio.py' -v
```

Live validation on 2026-09-08 verified the 1.31.0 chart archive's SHA-256 against
the index and its `Chart.yaml` (`name: istiod`, application/chart version 1.31.0).
All 18 chart-bearing records, including all 17 historical charts, rendered using
the replacement repository in isolated Helm directories. Existing version
records remain unchanged, including their `eolAt` fields; the shared reducer now
preserves those dates. No new EOL date is inferred from an approximate date in the
support table. The new image is `docker.io/istio/pilot:1.31.0`.

This verifies compatibility data and chart rendering; it is not a deployed
Kubernetes integration test.
