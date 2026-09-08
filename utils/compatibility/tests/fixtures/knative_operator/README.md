# Recorded upstream fixtures

Captured on 2026-09-08 for deterministic offline tests.

- `release-schedule.md` and `operator-index.yaml` are unmodified upstream source
  snapshots. Their retrieval URLs and SHA-256 file hashes are in `provenance.json`.
- `kubernetes-ga-releases.json` keeps the four relevant fields from each official
  Kubernetes GA release API response. `kubernetes-provenance.json` records the
  URLs and hashes of the original full responses, before this field projection.
- The Knative source snapshots are covered by the upstream Apache License 2.0,
  included as `LICENSE.knative`.

The tests also use small synthetic inputs for malformed data and release-date
boundaries. Refreshing the recorded snapshots requires updating the explicit
release-count and cutoff expectations.
