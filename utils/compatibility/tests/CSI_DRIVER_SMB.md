# SMB CSI Driver: source model and review limits

Draft contribution, prepared with AI assistance on 2026-09-10.
Target Plural commit: `66bad0cd9d6b11215a2b35f4672441ec19671320`.

## What this change does

Adds `scrapers/csi-driver-smb.py`, a metadata/catalog file, one manifest entry,
and targeted offline regressions. The new scraper uses the existing
`current_kube_version`, `fetch_page`, `print_error`, and
`update_compatibility_info` entry points. No new repository dependency is added.
The dispatcher imports `scrapers.<manifest name>`, which matches this filename.
The shared Helm image updater and summarizer are not copied or changed.

The table is expanded only from an explicit upstream `1.N+` lower bound through
Plural's configured Kubernetes 1.x ceiling. The current ceiling is 1.36.
This follows the declared-minimum source model used by the existing Longhorn
scraper, but does not claim that these combinations were tested on a cluster.
Empty `incompatibilities` means none was added from this source, not that none
exists. Empty structured `requirements` does not waive the prose prerequisites.

## Authoritative sources

- SMB README at pinned commit:
  https://github.com/kubernetes-csi/csi-driver-smb/blob/e5c7628b0490bad0665d95d675ce4072ed903f4b/README.md
- SMB chart index at the same commit:
  https://github.com/kubernetes-csi/csi-driver-smb/blob/e5c7628b0490bad0665d95d675ce4072ed903f4b/charts/index.yaml
- Helm installation and Windows HostProcess/proxy notes:
  https://github.com/kubernetes-csi/csi-driver-smb/blob/e5c7628b0490bad0665d95d675ce4072ed903f4b/charts/README.md
- Target integration example:
  https://github.com/pluralsh/console/blob/66bad0cd9d6b11215a2b35f4672441ec19671320/utils/compatibility/scrapers/longhorn.py
- Target writer and dispatcher:
  https://github.com/pluralsh/console/blob/66bad0cd9d6b11215a2b35f4672441ec19671320/utils/compatibility/utils.py
  https://github.com/pluralsh/console/blob/66bad0cd9d6b11215a2b35f4672441ec19671320/utils/compatibility/main.py

The included fixtures now contain the complete pinned README and Helm index.
Their Git blob hashes match the upstream files: README
`943392f0d39c9e86a92307e728f96999e0a431dd`, index
`d200d4ebbfaaf8fcb9f9135b74e6fc12c80a7fc6`. The index contains 31 entries,
including historical chart names and the two non-release `latest` entries.
The unit tests run offline. Separately, the GitHub integration job fetched the
complete current sources through the actual scraper/shared-fetch path and verified
that the source hashes match these pinned fixtures.

The current table names 1.20.3, 1.19.1 and 1.18.0. It does not establish the
support policy for every historical release or every patch in those series.
The implementation therefore generates only those three rows. A chart's mere
presence is not evidence of a release's Kubernetes compatibility. Earlier
recorded rows are left to the existing merge pipeline on future updates.

The development row and prereleases are excluded. App/chart matches are exact;
another patch of an app cannot stand in for a missing chart. Stable chart
selection is numeric, not index-order dependent. The actual chart `v` prefix is
preserved, including the historical naming before chart 1.18.0. Conflicting
source records stop the update instead of selecting one arbitrarily.

## Environment prerequisites, not invented version constraints

An existing configured SMB server is required. Upstream's table mentions
Windows CSI Proxy v0.2.2+, but its Helm guide says CSI Proxy is not needed when
`windows.useHostProcessContainers=true`. No unconditional proxy requirement is
therefore added to every row. Check the intended Windows mode before deployment.
The icon is the upstream Kubernetes CSI organization's avatar, not a claim of
a separate SMB product logo; maintainer approval of that choice is pending.

## Verification and reproducibility

Run the 41 targeted tests from the repository root after installing its Python
compatibility requirements:

```sh
python -m unittest discover -s utils/compatibility/tests -p test_csi_driver_smb.py -v
```

The parser, exact chart pairing, range bounds, schema errors, exclusions, stable
ordering and input preservation execute unchanged. Boundary tests substitute
only the existing shared adapters. The YAML loader rejects duplicate/non-string
mapping keys, aliases and merges using SafeLoader constructors; it does not
construct arbitrary Python objects. This is hardening of this contribution, not
a newly claimed upstream security finding.

Independent verification branch and immutable code:
https://github.com/olehworkfree-hash/flash-bounty-lab/tree/income/smb-final-2026-09-10
Commit: `17e137957b4f54f09d681dc93a08e2d5928ca263`.
Successful GitHub Actions run:
https://github.com/olehworkfree-hash/flash-bounty-lab/actions/runs/34488429744

That run checked out Plural `66bad0cd9d6b11215a2b35f4672441ec19671320` and performed:

- Original compatibility suite: 127 tests and 81 subtests passed.
- Candidate-only suite: 41 tests and 45 subtests passed.
- Combined compatibility suite after installing the candidate: 168 tests and
  126 subtests passed. This includes the preceding 41; counts are not additive.
- Real full-source retrieval, existing Plural writer and actual Helm rendering,
  producing three chart versions with nonempty Linux/Windows image references.
- Repeat generation with identical bytes and retention of existing summary data.
- Injected missing index and four malformed-YAML controls: duplicate top-level
  key, duplicate chart-field key, alias and merge key. Each retained the existing
  catalog bytes and reported an error before update.

No paid API calls were used. Optional summarization remained disabled. Only the
underlying HTTP timeout was bounded in the integration harness; the existing
writer, data processing and Helm integration were not replaced by mocks.

The seven-file patch also validates its catalog and manifest against the pinned
Plural JSON schema and preserves all 54 existing manifest names in order.
The included catalog is value-equivalent to the real generated table; YAML list
formatting has been normalized in this bundle.

## Review boundaries

The published verification branch is an independent review repository branch,
not a fork of Plural and not an upstream PR. This patch still needs a fork,
upstream review and the contributor verification/reward process. No assignment,
acceptance, earned reward or payment is implied.

Maintainers must decide whether this declared-minimum source model, three
explicitly documented releases and organization avatar are appropriate. The
aggregate `static/compatibilities.yaml` was not regenerated, and the full Console
application suite was not run. No Kubernetes cluster or runtime compatibility
matrix was tested. Future source format changes, all possible malformed inputs
and errors inside the shared writer are not exhaustively covered by these tests.

## Fixture license included for redistribution

The unchanged README and Helm-index fixtures are copied from the Kubernetes CSI
SMB project at the pinned source commit linked above. A complete copy of the
upstream Apache License 2.0 is included at
`fixtures/csi-driver-smb/LICENSE` alongside the fixtures. This additional notice
does not change the source provenance, implementation or tests.
